export const CONTEXT_BUDGET = 8000

export interface ContextStep {
  thought: string
  routes: string[]
  artifactId?: string
  summary: string
}

export interface ContextBuildResult {
  messages: Array<{ role: 'system' | 'user'; content: string }>
  estTokens: number
  stepsCompacted: number
  compacted: boolean
  digest: string
}

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

export function buildContextMessages(objective: string, history: ContextStep[], graphShape = 'standard', agentList = ''): ContextBuildResult {
  const system = `You are the AXIOM orchestrator. Graph shape: ${graphShape}. Respond with JSON only.`
  const userParts: string[] = []
  userParts.push(`Objective: ${objective}`)

  const last = history.slice(-3)
  const older = history.slice(0, -3)

  if (last.length) {
    userParts.push('Recent steps:')
    for (const step of last) {
      userParts.push(`- thought: ${step.thought}`)
      userParts.push(`  routes: ${step.routes.join(', ')}`)
      if (step.artifactId && step.summary) {
        userParts.push(`  artifact: ${step.artifactId} · ${step.summary}`)
      }
    }
  }

  if (agentList) {
    userParts.push('Available agents:')
    userParts.push(agentList)
  }

  let estTokens = estimateTokens(system + userParts.join('\n'))
  let digest = ''
  let stepsCompacted = 0

  if (older.length) {
    const lines: string[] = []
    for (let i = 0; i < older.length; i++) {
      const step = older[i]
      if (step.artifactId && step.summary) {
        const trimmedSummary = step.summary.length > 120 ? step.summary.slice(0, 117) + '...' : step.summary
        lines.push(`${step.artifactId} · ${step.routes.join(', ')} · ${trimmedSummary}`)
      } else {
        lines.push(`${step.routes.join(', ')} · ${step.thought}`)
      }
    }
    digest = 'Mission digest:\n' + lines.join('\n')
    estTokens += estimateTokens(digest)
    stepsCompacted = older.length
  }

  const content = userParts.join('\n') + (digest ? '\n\n' + digest : '')
  const messages = [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content },
  ]

  return {
    messages,
    estTokens,
    stepsCompacted,
    compacted: stepsCompacted > 0,
    digest,
  }
}
