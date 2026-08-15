import bus from './bus'
import { getDef, getDefs, setAgentState } from './agents'
import { AGENT_OUTPUT_SCHEMAS } from './artifacts'
import type { ArtifactRecord } from './types'

export const MAX_GATE_REPAIR_ROUNDS = 2

export interface GateResult {
  verdict: 'pass' | 'fail' | 'verified:false'
  detail?: string
  issues?: string[]
  jury?: JuryVote[]
}

export interface JuryVote {
  agent: string
  model: string
  verdict: 'pass' | 'fail'
  issues: string[]
}

export async function runFinalGate(artifact: { id: string; nodeId: string; kind: string; summary: string; content: string }, researcherArtifactIds: string[] = [], options?: { juryMode?: boolean; objective?: string; artifactStore?: { get: (id: string) => Promise<ArtifactRecord | undefined> }; workerStreamFn?: typeof import('./llm').workerStream }): Promise<GateResult> {
  const juryMode = options?.juryMode ?? false
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

  const baseCritic = getDef('CRITIC') ?? getDefs().find((d) => d.role === 'critic') ?? getDefs()[getDefs().length - 1]
  const critics = juryMode ? buildJury(baseCritic) : [{ ...baseCritic, model: baseCritic.model }]
  const votes: JuryVote[] = []

  for (const critic of critics) {
    setAgentState(critic.id, 'running')
    try {
      const verdict = await runFreshCritic(critic, artifact, options?.objective, options?.artifactStore, options?.workerStreamFn)
      votes.push(verdict)
      bus.emit({ type: 'jury-vote', agent: critic.id, model: critic.model, verdict: verdict.verdict })
      setAgentState(critic.id, 'done')
    } catch (err: any) {
      setAgentState(critic.id, 'fault')
      bus.emit({ type: 'fault', agent: critic.id, error: err?.message ?? 'critic-error' })
      votes.push({ agent: critic.id, model: critic.model, verdict: 'fail', issues: [err?.message ?? 'critic-error'] })
    }
  }

  const passCount = votes.filter((v) => v.verdict === 'pass').length
  const passed = juryMode ? passCount >= 2 : passCount >= 1
  const allIssues = votes.flatMap((v) => v.issues)

  if (passed) {
    bus.emit({ type: 'gate-pass', gate: 'final-gate', detail: 'critic-done' })
    return { verdict: 'pass', jury: votes }
  }

  bus.emit({ type: 'gate-fail', gate: 'final-gate', detail: allIssues[0] ?? 'critic-fail' })
  return { verdict: 'fail', issues: allIssues, jury: votes }
}

export async function runFreshCritic(
  critic: { id: string; label: string; model: string; system: string; outputSchema?: any },
  artifact: { id: string; nodeId: string; kind: string; summary: string; content: string },
  objective?: string,
  artifactStore?: { get: (id: string) => Promise<ArtifactRecord | undefined> },
  workerStreamFn: typeof import('./llm').workerStream = async () => ({ text: '' })
): Promise<JuryVote> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: critic.system },
  ]

  const userParts: string[] = []
  if (objective) userParts.push(`Objective: ${objective}`)
  userParts.push(`Artifact ID: ${artifact.id}`)
  userParts.push(`Artifact kind: ${artifact.kind}`)
  userParts.push(`Artifact summary: ${artifact.summary}`)

  const fullText = artifact.content
  if (fullText.length <= 4000) {
    userParts.push(`Artifact content:\n${fullText}`)
  } else {
    userParts.push(`Artifact summary text:\n${fullText.slice(0, 4000)}`)
    if (artifactStore) {
      const full = await artifactStore.get(artifact.id)
      if (full?.content) userParts.push(`\nFull artifact content:\n${full.content}`)
    }
  }

  messages.push({ role: 'user', content: userParts.join('\n\n') })

  let outputText = ''
  try {
    await workerStreamFn({
      model: critic.model,
      system: critic.system,
      user: messages[messages.length - 1].content,
      signal: new AbortController().signal,
      maxTokens: 1200,
      onChunk: ({ textDelta }) => {
        outputText += textDelta ?? ''
      },
    })
  } catch {
    return { agent: critic.id, model: critic.model, verdict: 'fail', issues: ['critic-call-failed'] }
  }

  let parsed: { verdict: 'pass' | 'fail'; issues: string[] } | null = null
  try {
    const json = JSON.parse(outputText)
    if (json?.verdict === 'pass' || json?.verdict === 'fail') {
      parsed = { verdict: json.verdict, issues: Array.isArray(json.issues) ? json.issues : [] }
    }
  } catch {
    // fallthrough
  }

  if (!parsed) {
    const lower = outputText.toLowerCase()
    parsed = lower.includes('pass') ? { verdict: 'pass', issues: [] } : { verdict: 'fail', issues: ['unparsable-critic-output'] }
  }

  return { agent: critic.id, model: critic.model, ...parsed }
}

export function buildJury(baseCritic: { id?: string; label: string; model: string; system: string; outputSchema?: any }) {
  const models = [
    { model: 'anthropic/claude-3.5-sonnet', label: 'CLAUDE' },
    { model: 'openai/gpt-4o', label: 'GPT4O' },
    { model: 'google/gemini-1.5-pro', label: 'GEMINI' },
  ]
  return models.map((m, idx) => ({
    id: `${baseCritic.id ?? 'CRITIC'}-JURY-${idx + 1}`,
    label: `${baseCritic.label}-JURY-${idx + 1}`,
    role: 'critic',
    model: m.model,
    system: baseCritic.system,
    outputSchema: baseCritic.outputSchema,
  }))
}
