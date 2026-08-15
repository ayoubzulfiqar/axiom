import bus from './bus'
import { parsePlan } from './protocol'
import { getDefs, getDef, setAgentState } from './agents'
import { loadKey, budgetAvailable } from './vault'
import { planOnce, workerStream, makeWebSearchTool, makeCodeExecTool } from './llm'
import { ArtifactStore } from './storage'
import { upsertCheckpoint } from './checkpoints'
import { runFinalGate } from './gates'
import { emitArtifactStored } from './artifacts'
import { resolvePolicy, getPolicyFor, errorTypeFor } from './policies'
import type { ArtifactRecord } from './types'
import { structuredSummaryForRole } from './artifacts'

const artifactStore = new ArtifactStore((globalThis as any).axiomDb ?? new (require('dexie').default)('axiom'))

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

async function createArtifactRecord(missionId: string, nodeId: string, kind: string, content: string, rawSummary?: string): Promise<{ id: string; summary: string }> {
  const id = crypto.randomUUID()
  const summary = rawSummary ?? content.slice(0, 500)
  const record = {
    id,
    missionId,
    nodeId,
    kind: kind as ArtifactRecord['kind'],
    summary,
    content,
    createdAt: Date.now(),
  }
  await artifactStore.put(record as any)
  emitArtifactStored(id, nodeId, kind, summary)
  return { id, summary }
}

async function agentResultToArtifact(missionId: string, _objective: string, task: { agent: string; task: string }, text: string): Promise<{ id: string; summary: string }> {
  const def = getDef(task.agent)
  const role = def?.role ?? 'raw'
  const kind = role === 'researcher' ? 'research' : role === 'analyst' ? 'analysis' : role === 'writer' ? 'draft' : role === 'critic' ? 'critique' : 'raw'
  const { summary } = structuredSummaryForRole(role, text)
  const record = await createArtifactRecord(missionId, task.agent, kind, text, summary)
  return { id: record.id, summary }
}

export async function runMission(objective: string, signal: AbortController): Promise<string> {
  const missionId = crypto.randomUUID()
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
  const history: { thought: string; routes: string[]; artifactId?: string; summary: string }[] = []
  try {
    await upsertCheckpoint({
      missionId,
      status: 'running',
      currentStep: 0,
      completedNodes: [],
      decisions: [],
      artifactIds: [],
      budgets: { stepsUsed: 0, tokensUsed: 0, fullReads: 0 },
      updatedAt: Date.now(),
    })

    for (let steps = 0; steps < MAX_STEPS; steps++) {
      if (signal.signal.aborted) throw new Error('ABORTED')
      const orchestrator = getDef('ORCH') ?? getDefs()[0]
      const agentList = getDefs().map((d) => `- ${d.id} (${d.role})`).join('\n')
      const context = history.length ? `\nPrevious steps:\n${history.map((h) => `- ${h.thought}\n  routes: ${h.routes.join(', ')}\n  artifact: ${h.summary}`).join('\n')}` : ''
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
        bus.emit({ type: 'plan-step', n: steps + 1, total: MAX_STEPS, thought: plan.thought, decision: { routes: plan.dispatch.map((d) => d.agent) } })
        if (plan.final) {
          const artifact = await createArtifactRecord(missionId, 'ORCH', 'final', plan.final, plan.final)
          const gate = await runFinalGate(artifact as any, [])
          if (gate.verdict === 'fail') {
            bus.emit({ type: 'mission-complete', final: plan.final, artifactId: artifact.id, verified: false })
            return plan.final
          }
          bus.emit({ type: 'mission-complete', final: plan.final, artifactId: artifact.id, verified: true })
          return plan.final
        }
        if (plan.dispatch.length === 0) continue
        const results = await Promise.allSettled(
          plan.dispatch.map((d) => dispatchAgent(objective, missionId, d, signal).then((r) => {
            latencyTimestamps.set(d.agent, Date.now())
            return r
          }))
        )
        const artifacts = results.filter((r): r is PromiseFulfilledResult<{ id: string; summary: string }> => r.status === 'fulfilled').map((r) => r.value)
        history.push({ thought: plan.thought, routes: plan.dispatch.map((d) => d.agent), artifactId: artifacts[0]?.id, summary: artifacts[0]?.summary ?? '' })
        continue
      }

      const plan = parsed.plan
      bus.emit({ type: 'plan-step', n: steps + 1, total: MAX_STEPS, thought: plan.thought, decision: { routes: plan.dispatch.map((d) => d.agent) } })
      if (plan.final) {
        const artifact = await createArtifactRecord(missionId, 'ORCH', 'final', plan.final, plan.final)
        const gate = await runFinalGate(artifact as any, [])
        if (gate.verdict === 'fail') {
          bus.emit({ type: 'mission-complete', final: plan.final, artifactId: artifact.id, verified: false })
          return plan.final
        }
        bus.emit({ type: 'mission-complete', final: plan.final, artifactId: artifact.id, verified: true })
        return plan.final
      }
      if (plan.dispatch.length === 0) continue
      const results = await Promise.allSettled(
        plan.dispatch.map((d) => dispatchAgent(objective, missionId, d, signal).then((r) => {
          latencyTimestamps.set(d.agent, Date.now())
          return r
        }))
      )
      const artifacts = results.filter((r): r is PromiseFulfilledResult<{ id: string; summary: string }> => r.status === 'fulfilled').map((r) => r.value)
      history.push({ thought: plan.thought, routes: plan.dispatch.map((d) => d.agent), artifactId: artifacts[0]?.id, summary: artifacts[0]?.summary ?? '' })
    }
    const fallback = history.length ? history[history.length - 1].summary : objective
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
  missionId: string,
  task: { agent: string; task: string },
  signal: AbortController
): Promise<{ id: string; summary: string }> {
  const def = getDef(task.agent)
  if (!def) throw new Error(`UNKNOWN_AGENT ${task.agent}`)
  setAgentState(task.agent, 'running')
  bus.emit({ type: 'agent-start', agent: task.agent })
  latencyTimestamps.set(task.agent, Date.now())
  let accumulated = ''
  let attempts = 0
  const maxAttempts = (getPolicyFor(def).retries ?? 1) + 1

  while (attempts < maxAttempts) {
    try {
      const tools: Record<string, any> = {}
      if (def.tools?.includes('web_search')) tools.web_search = makeWebSearchTool()
      if (def.tools?.includes('code_exec')) tools.code_exec = makeCodeExecTool()

      const schemaHint = def.outputSchema ? `\nReply ONLY with JSON matching schema:\n${(def.outputSchema as any).description ?? 'structured JSON'}` : ''

      const result = await workerStream({
        model: def.model,
        system: def.system + schemaHint,
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
      return agentResultToArtifact(missionId, objective, task, text)
    } catch (err: unknown) {
      attempts++
      const msg = err instanceof Error ? err.message : 'UNKNOWN'
      const errType = errorTypeFor(err)
      const policy = resolvePolicy(task.agent, errType, msg)

      if (attempts >= maxAttempts || ['stop','skip','fallback','escalate'].includes(policy.policy as string)) {
        setAgentState(task.agent, 'fault')
        bus.emit({ type: 'fault', agent: task.agent, error: msg })
        if (policy.policy === 'stop' || policy.policy === 'escalate') {
          bus.emit({ type: 'policy-applied', agent: task.agent, policy: policy.policy, detail: msg })
        }
        throw err
      }

      await sleep(RETRY_DELAY_MS * attempts)
    }
  }
  throw new Error(`UNKNOWN_AGENT ${task.agent}`)
}

export function latencyFor(agent: string): number {
  const start = latencyTimestamps.get(agent)
  if (!start) return 0
  return Date.now() - start
}
