import bus from './bus'
import { parsePlan } from './protocol'
import { getDefs, getDef, setAgentState, initDefs } from './agents'
import { loadKey, budgetAvailable } from './vault'
import { planOnce, workerStream, makeWebSearchTool, makeCodeExecTool } from './llm'
import { ArtifactStore } from './storage'
import { upsertCheckpoint } from './checkpoints'
import { runFinalGate } from './gates'
import { emitArtifactStored } from './artifacts'
import { resolvePolicy, getPolicyFor, errorTypeFor } from './policies'
import { structuredSummaryForRole } from './artifacts'
import { recordCall, simulateCost } from './cost'
import { buildContextMessages } from './context'

import { db } from '../lib/db'

const artifactStore = new ArtifactStore((globalThis as any).axiomDb ?? db)

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

async function createArtifactRecord(missionId: string, nodeId: string, kind: string, content: string, rawSummary?: string, shardIndex?: number): Promise<{ id: string; summary: string }> {
  const id = crypto.randomUUID()
  const summary = rawSummary ?? content.slice(0, 500)
  const record: any = {
    id,
    missionId,
    nodeId,
    kind: kind === 'draft' && typeof shardIndex === 'number' ? 'draft-shard' : kind,
    summary,
    content,
    createdAt: Date.now(),
  }
  if (typeof shardIndex === 'number') record.shardIndex = shardIndex
  await artifactStore.put(record)
  emitArtifactStored(id, nodeId, record.kind, summary)
  return { id, summary }
}

async function agentResultToArtifact(missionId: string, _objective: string, task: { agent: string; task: string }, text: string, shardIndex?: number): Promise<{ id: string; summary: string; content: string }> {
  const def = getDef(task.agent)
  const role = def?.role ?? 'raw'
  const kind = role === 'researcher' ? 'research' : role === 'analyst' ? 'analysis' : role === 'writer' ? 'draft' : role === 'critic' ? 'critique' : 'raw'
  const { summary } = structuredSummaryForRole(role, text)
  const record = await createArtifactRecord(missionId, task.agent, kind, text, summary, shardIndex)
  return { id: record.id, summary, content: text }
}

export async function runMission(objective: string, signal: AbortController, shape: string = 'standard'): Promise<string> {
  initDefs()
  const missionId = crypto.randomUUID()
  const apiKey = await loadKey()
  if (!apiKey) {
    bus.emit({ type: 'fault', agent: 'orchestrator', error: 'AUTH ▸ missing API key' })
    throw new Error('AUTH')
  }

  const budget = await budgetAvailable(apiKey)
  if (!budget.ok) {
    const detail =
      budget.reason === 'invalid-key'
        ? 'API key rejected by OpenRouter (401) — check your key in Vault'
        : budget.reason === 'budget-exhausted'
          ? `budget exhausted: usage ${budget.usage?.toFixed(4)} / limit ${budget.limit?.toFixed(2)}`
          : `BUDGET ▸ usage ${budget.usage?.toFixed(4)} / limit ${budget.limit?.toFixed(2)}`
    bus.emit({ type: 'fault', agent: 'orchestrator', error: `BUDGET ▸ ${detail}` })
    throw new Error('BUDGET')
  }

  running.add(signal)
  bus.emit({ type: 'mission-start', objective })
  const history: { thought: string; routes: string[]; artifactId?: string; summary: string }[] = []
  let serialMs = 0
  let parallelMs = 0
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
      const context = buildContextMessages(objective, history, shape, agentList)
      if (context.compacted) {
        bus.emit({ type: 'context-compacted', stepsCompacted: context.stepsCompacted, estTokens: context.estTokens })
      }

      const planStart = Date.now()
      const planText = await planOnce({
        model: orchestrator.model,
        system: context.messages[0].content,
        user: context.messages[1].content,
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
        serialMs += Date.now() - planStart
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
        const dispatchStart = Date.now()
        const results = await Promise.allSettled(
          plan.dispatch.map((d) => dispatchAgent(objective, missionId, d, signal).then((r) => {
            latencyTimestamps.set(d.agent, Date.now())
            return r
          }))
        )
        parallelMs += Date.now() - dispatchStart
        const artifacts = results.filter((r): r is PromiseFulfilledResult<{ id: string; summary: string; content: string }> => r.status === 'fulfilled').map((r) => r.value)
        history.push({ thought: plan.thought, routes: plan.dispatch.map((d) => d.agent), artifactId: artifacts[0]?.id, summary: artifacts[0]?.summary ?? '' })
        continue
      }

      const plan = parsed.plan
      serialMs += Date.now() - planStart
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
      const dispatchStart = Date.now()
      const dispatchResults = await Promise.allSettled(
        plan.dispatch.map((d, idx) => dispatchAgent(objective, missionId, d, signal, getDef(d.agent)?.role === 'writer' ? idx : undefined).then((r) => {
          latencyTimestamps.set(d.agent, Date.now())
          return { result: r, index: idx, agent: d.agent }
        }))
      )
      parallelMs += Date.now() - dispatchStart
      const artifacts = dispatchResults
        .filter((r): r is PromiseFulfilledResult<{ result: { id: string; summary: string; content: string }; index: number; agent: string }> => r.status === 'fulfilled')
        .map((r) => r.value.result)

      let merged = artifacts[0]
      if (plan.merge && artifacts.length > 1) {
        const writerShards = dispatchResults
          .filter((r): r is PromiseFulfilledResult<{ result: { id: string; summary: string; content: string }; index: number; agent: string }> => r.status === 'fulfilled')
          .filter((r) => getDef(r.value.agent)?.role === 'writer')
          .map((r, i) => ({ ...r.value.result, shardIndex: i }))

        if (writerShards.length > 1) {
          const mergeStart = Date.now()
          const mergedArtifact = mergeShards(writerShards)
          serialMs += Date.now() - mergeStart
          merged = { id: mergedArtifact.id, summary: mergedArtifact.summary, content: mergedArtifact.content }
        }
      }
      history.push({ thought: plan.thought, routes: plan.dispatch.map((d) => d.agent), artifactId: merged?.id, summary: merged?.summary ?? '' })
    }
    const totalMs = serialMs + parallelMs
    bus.emit({ type: 'telemetry-updated', serialMs, parallelMs, totalMs, maxConcurrentWorkers: Math.max(1, getDefs().length) })
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
  signal: AbortController,
  shardIndex?: number
): Promise<{ id: string; summary: string; content: string }> {
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
      if (!text.trim()) {
        throw new Error('EMPTY_RESPONSE model returned no content')
      }
      setAgentState(task.agent, 'done')
      bus.emit({ type: 'agent-done', agent: task.agent })
      const usage = (result as any)?.usage as
        | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number }
        | Promise<{ prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number }>
        | undefined
      const resolvedUsage = usage && typeof (usage as any).then === 'function' ? await (usage as any) : usage
      if (resolvedUsage) {
        const cost = recordCall(task.agent, def.model, resolvedUsage)
        bus.emit({ type: 'cost-updated', nodeId: task.agent, missionCostUsd: cost.missionCostUsd, nodeCostUsd: cost.nodeCostUsd })
      } else {
        const cost = simulateCost(task.agent, def.model)
        bus.emit({ type: 'cost-updated', nodeId: task.agent, missionCostUsd: cost.missionCostUsd, nodeCostUsd: cost.nodeCostUsd })
      }
      return agentResultToArtifact(missionId, objective, task, text, shardIndex)
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

export function mergeShards(shards: Array<{ id: string; summary: string; content: string; shardIndex?: number }>): { id: string; summary: string; content: string } {
  const sorted = shards.slice().sort((a, b) => (a.shardIndex ?? 0) - (b.shardIndex ?? 0))
  const seen = new Set<string>()
  const sections: { heading: string; body: string }[] = []
  for (const shard of sorted) {
    const parsed = safeParseShardContent(shard.content)
    const items = Array.isArray(parsed) ? parsed : [{ heading: shard.summary || `Shard ${shard.shardIndex ?? 0}`, body: shard.content }]
    for (const item of items) {
      const key = item.heading.trim().toLowerCase()
      if (key && !seen.has(key)) {
        seen.add(key)
        sections.push({ heading: item.heading, body: item.body })
      }
    }
  }
  const merged = sections.map((s) => `# ${s.heading}\n\n${s.body}`).join('\n\n')
  const summary = `Merged ${sorted.length} shard(s) into ${sections.length} section(s).`
  return { id: crypto.randomUUID(), summary, content: merged }
}

function safeParseShardContent(raw: string): Array<{ heading: string; body: string }> | null {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1))
      if (Array.isArray(parsed)) return parsed.map((x: any) => ({ heading: String(x?.heading ?? 'Section'), body: String(x?.body ?? x?.content ?? '') }))
      if (Array.isArray(parsed?.sections)) return parsed.sections.map((x: any) => ({ heading: String(x?.heading ?? 'Section'), body: String(x?.body ?? '') }))
    } catch {
      // fallback
    }
  }
  return null
}
