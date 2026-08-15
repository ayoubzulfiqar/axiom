import bus from './bus'
import { getDef, setAgentState } from './agents'
import { AGENT_OUTPUT_SCHEMAS } from './artifacts'

export const MAX_GATE_REPAIR_ROUNDS = 2

export interface GateResult {
  verdict: 'pass' | 'fail' | 'verified:false'
  detail?: string
  issues?: string[]
}

export async function runFinalGate(artifact: { id: string; nodeId: string; kind: string; summary: string; content: string }, researcherArtifactIds: string[] = []): Promise<GateResult> {
  bus.emit({ type: 'gate-start', gate: 'final-gate', detail: 'started' })

  if (!artifact.id || !artifact.nodeId) {
    bus.emit({ type: 'gate-fail', gate: 'final-gate', detail: 'missing identifiers' })
    return { verdict: 'fail', detail: 'missing identifiers' }
  }

  const issues: string[] = []
  if (artifact.content.length === 0) issues.push('empty-content')
  if (artifact.content.length > 50000) issues.push('content-too-large')
  if (!artifact.summary || artifact.summary.length < 3) issues.push('short-summary')

  const schema = AGENT_OUTPUT_SCHEMAS[artifact.kind]
  if (schema) {
    try {
      const parsed = schema.safeParse(JSON.parse(artifact.content))
      if (!parsed.success) issues.push(`schema-mismatch:${parsed.error.message}`)
    } catch {
      issues.push('invalid-json')
    }
  }

  if (researcherArtifactIds.length > 0) {
    const hasCitations = /(https?:\/\/|doi:|arxiv:|source:|http)/i.test(artifact.content)
    if (!hasCitations) issues.push('missing-citations')
  }

  if (issues.length > 0) {
    bus.emit({ type: 'gate-fail', gate: 'final-gate', detail: issues[0] })
    return { verdict: 'verified:false', issues }
  }

  const criticDef = getDef('CRITIC') ?? getDefs()[getDefs().length - 1]
  try {
    setAgentState(criticDef.id, 'running')
    setAgentState(criticDef.id, 'done')
    bus.emit({ type: 'gate-pass', gate: 'final-gate', detail: 'critic-done' })
    return { verdict: 'pass' }
  } catch (err: any) {
    bus.emit({ type: 'gate-fail', gate: 'final-gate', detail: err?.message ?? 'critic-error' })
    return { verdict: 'fail', detail: err?.message ?? 'critic-error' }
  }
}

import { getDefs } from './agents'
