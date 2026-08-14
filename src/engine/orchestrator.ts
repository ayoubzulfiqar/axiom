import bus from './bus'
import { parsePlan } from './protocol'
import { getDefs, getDef, setAgentState } from './agents'
import { loadKey, API_BASE } from './vault'

const MAX_STEPS = 6
const MAX_TOKENS = 1500

export interface MissionContext {
  abortController: AbortController
  onComplete: (artifact: string) => void
  onFault: (error: string) => void
}

const running = new Set<AbortController>()
const latencyTimestamps = new Map<string, number>()

export function abortAll() {
  for (const ac of running) {
    try {
      ac.abort()
    } catch {}
  }
  running.clear()
}

async function llmCall(model: string, system: string, prompt: string, signal: AbortSignal, stream = false): Promise<string> {
  const apiKey = loadKey()
  if (!apiKey) throw new Error('NO_KEY')
  const base = API_BASE.replace(/\/$/, '')
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    max_tokens: MAX_TOKENS,
    stream,
  }
  const controller = new AbortController()
  signal.addEventListener('abort', () => controller.abort(), { once: true })
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof location !== 'undefined' ? location.origin : '',
      'X-Title': 'AXIOM Orchestration',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (stream) {
    // simple text extraction from SSE-like response
    const text = data.choices?.[0]?.message?.content ?? ''
    return text
  }
  return data.choices?.[0]?.message?.content ?? ''
}

export async function runMission(
  objective: string,
  signal: AbortSignal
): Promise<string> {
  bus.emit({ type: 'mission-start', objective })
  const history: string[] = []
  try {
    for (let steps = 0; steps < MAX_STEPS; steps++) {
      const orchestrator = getDef('ORCH') ?? getDefs()[0]
      const agentList = getDefs().map((d) => `- ${d.id} (${d.role})`).join('\n')
      const context = history.length ? `\nPrevious steps:\n${history.join('\n\n')}` : ''
      const planText = await llmCall(
        orchestrator.model,
        orchestrator.system,
        `Objective: ${objective}\nStep: ${steps + 1} of ${MAX_STEPS}\nAvailable agents:\n${agentList}\n${context}\nRespond only with JSON.`,
        signal
      )
      const parsed = parsePlan(planText)
      if (!parsed.ok) {
        const retry = await llmCall(
          orchestrator.model,
          orchestrator.system,
          `The previous response failed to parse: ${parsed.error}. Resend JSON only.`,
          signal
        )
        const parsed2 = parsePlan(retry)
        if (!parsed2.ok) throw new Error(`PLAN_PARSE_FAIL: ${parsed2.error}`)
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
    if (msg === 'ABORTED') throw new Error('ABORTED')
    bus.emit({ type: 'fault', agent: 'orchestrator', error: msg })
    throw err
  }
}

async function dispatchAgent(objective: string, task: { agent: string; task: string }, signal: AbortSignal): Promise<string> {
  const def = getDef(task.agent)
  if (!def) throw new Error(`UNKNOWN_AGENT ${task.agent}`)
  setAgentState(task.agent, 'running')
  bus.emit({ type: 'agent-start', agent: task.agent })
  latencyTimestamps.set(task.agent, Date.now())
  let accumulated = ''
  try {
    const stream = await llmCall(def.model, def.system, `Mission objective: ${objective}\nTask: ${task.task}`, signal, true)
    accumulated = stream
    bus.emit({ type: 'token', agent: task.agent, text: stream })
    setAgentState(task.agent, 'done')
    bus.emit({ type: 'agent-done', agent: task.agent })
    return accumulated
  } catch (err: unknown) {
    setAgentState(task.agent, 'fault')
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    bus.emit({ type: 'fault', agent: task.agent, error: msg })
    throw err
  }
}

export function latencyFor(agent: string): number {
  const start = latencyTimestamps.get(agent)
  if (!start) return 0
  return Date.now() - start
}
