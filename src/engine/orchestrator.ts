import bus from './bus'
import { parsePlan } from './protocol'
import { getDefs, getDef, setAgentState } from './agents'
import { loadKey, budgetAvailable } from './vault'
import { planOnce, workerStream, makeWebSearchTool, makeCodeExecTool } from './llm'

export const MAX_STEPS = 6
export const MAX_TOKENS = 1500
const RETRY_DELAY_MS = 800

export interface MissionContext {
  abortController: AbortController
  onComplete: (artifact: string) => void
  onFault: (error: string) => void
}

const running = new Set<AbortController>()
const latencyTimestamps = new Map<string, number>()

export function abortAll() {
  for (const ac of running) {
    try { ac.abort() } catch {}
  }
  running.clear()
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function runMission(objective: string, signal: AbortController): Promise<string> {
  const apiKey = await loadKey()
  if (!apiKey) {
    bus.emit({ type: 'fault', agent: 'orchestrator', error: 'AUTH ▸ missing API key' })
    throw new Error('AUTH')
  }

  const budget = await budgetAvailable(apiKey)
  if (!budget.ok) {
    bus.emit({ type: 'fault', agent: 'orchestrator', error: `BUDGET ▸ usage ${budget.usage?.toFixed(4)} / limit ${budget.limit?.toFixed(2)}` })
    throw new Error('BUDGET')
  }

  running.add(signal)
  bus.emit({ type: 'mission-start', objective })
  const history: string[] = []
  try {
    for (let steps = 0; steps < MAX_STEPS; steps++) {
      if (signal.signal.aborted) throw new Error('ABORTED')
      const orchestrator = getDef('ORCH') ?? getDefs()[0]
      const agentList = getDefs().map((d) => `- ${d.id} (${d.role})`).join('\n')
      const context = history.length ? `\nPrevious steps:\n${history.join('\n\n')}` : ''
      const planText = await planOnce({
        model: orchestrator.model,
        system: orchestrator.system,
        user: `Objective: ${objective}\nStep: ${steps + 1} of ${MAX_STEPS}\nAvailable agents:\n${agentList}\n${context}\nRespond only with JSON.`,
        signal: signal.signal,
        maxTokens: MAX_TOKENS,
      })
      const parsed = parsePlan(planText)
      if (!parsed.ok) {
        if (signal.signal.aborted) throw new Error('ABORTED')
        const retry = await planOnce({
          model: orchestrator.model,
          system: orchestrator.system,
          user: `The previous response failed to parse: ${parsed.error}. Resend JSON only.`,
          signal: signal.signal,
          maxTokens: MAX_TOKENS,
        })
        const parsed2 = parsePlan(retry)
        if (!parsed2.ok) {
          bus.emit({ type: 'fault', agent: 'orchestrator', error: `PLAN_PARSE_FAIL: ${parsed2.error}` })
          throw new Error(`PLAN_PARSE_FAIL: ${parsed2.error}`)
        }
        const plan = parsed2.plan
        bus.emit({ type: 'plan-step', n: steps + 1, total: MAX_STEPS, thought: plan.thought })
        if (plan.final) {
          bus.emit({ type: 'mission-complete', final: plan.final })
          return plan.final
        }
        if (plan.dispatch.length === 0) continue
        const results = await Promise.all(
          plan.dispatch.map((d) => dispatchAgent(objective, d, signal).then((r) => {
            latencyTimestamps.set(d.agent, Date.now())
            return r
          }))
        )
        history.push(...results)
        continue
      }
      const plan = parsed.plan
      bus.emit({ type: 'plan-step', n: steps + 1, total: MAX_STEPS, thought: plan.thought })
      if (plan.final) {
        bus.emit({ type: 'mission-complete', final: plan.final })
        return plan.final
      }
      if (plan.dispatch.length === 0) continue
      const results = await Promise.all(
        plan.dispatch.map((d) => dispatchAgent(objective, d, signal).then((r) => {
          latencyTimestamps.set(d.agent, Date.now())
          return r
        }))
      )
      history.push(...results)
    }
    const fallback = history.length ? history[history.length - 1] : objective
    bus.emit({ type: 'mission-complete', final: fallback })
    return fallback
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg === 'ABORTED') {
      bus.emit({ type: 'fault', agent: 'orchestrator', error: 'ABORTED' })
      throw new Error('ABORTED')
    }
    bus.emit({ type: 'fault', agent: 'orchestrator', error: msg })
    throw err
  } finally {
    running.delete(signal)
  }
}

export async function dispatchAgent(
  objective: string,
  task: { agent: string; task: string },
  signal: AbortController
): Promise<string> {
  const def = getDef(task.agent)
  if (!def) throw new Error(`UNKNOWN_AGENT ${task.agent}`)
  setAgentState(task.agent, 'running')
  bus.emit({ type: 'agent-start', agent: task.agent })
  latencyTimestamps.set(task.agent, Date.now())
  let accumulated = ''
  try {
    const tools: Record<string, any> = {}
    if (def.tools?.includes('web_search')) {
      tools.web_search = makeWebSearchTool()
    }
    if (def.tools?.includes('code_exec')) {
      tools.code_exec = makeCodeExecTool()
    }

    const result = await workerStream({
      model: def.model,
      system: def.system,
      user: `Mission objective: ${objective}\nTask: ${task.task}`,
      signal: signal.signal,
      maxTokens: MAX_TOKENS,
      tools,
      maxSteps: 3,
      onChunk: ({ textDelta }) => {
        accumulated += textDelta ?? ''
        bus.emit({ type: 'token', agent: task.agent, text: textDelta ?? '' })
      },
    })
    const text = accumulated || result.text || ''
    setAgentState(task.agent, 'done')
    bus.emit({ type: 'agent-done', agent: task.agent })
    return text
  } catch (err: unknown) {
    setAgentState(task.agent, 'fault')
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
      await sleep(RETRY_DELAY_MS)
      bus.emit({ type: 'fault', agent: task.agent, error: `RATE ▸ ${msg}` })
    } else if (msg.includes('401')) {
      bus.emit({ type: 'fault', agent: task.agent, error: 'AUTH ▸ invalid key' })
    } else if (msg.includes('402')) {
      bus.emit({ type: 'fault', agent: task.agent, error: 'CREDITS ▸ insufficient balance' })
    } else {
      bus.emit({ type: 'fault', agent: task.agent, error: msg })
    }
    throw err
  }
}

export function latencyFor(agent: string): number {
  const start = latencyTimestamps.get(agent)
  if (!start) return 0
  return Date.now() - start
}
