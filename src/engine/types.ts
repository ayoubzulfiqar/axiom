export interface AgentDef {
  id: string
  label: string
  role: string
  model: string
  system: string
  state: 'idle' | 'running' | 'done' | 'fault'
  tools?: string[]
  outputSchema?: any
  failure?: string
  policy?: {
    retries: number
    fallbackModel?: string
    onFail: 'retry' | 'fallback' | 'skip' | 'repair' | 'escalate' | 'stop'
  }
}

export interface ArtifactRecord {
  id?: string
  missionId: string
  nodeId: string
  kind: 'research' | 'analysis' | 'draft' | 'critique' | 'final' | 'raw' | 'draft-shard'
  summary: string
  content: string
  createdAt: number
  shardIndex?: number
  mergedFrom?: string[]
}

export interface CheckpointRecord {
  missionId: string
  status: 'running' | 'paused' | 'awaiting-approval' | 'interrupted'
  currentStep: number
  completedNodes: string[]
  decisions: Array<{ step: number; thought: string; routes: string[] }>
  artifactIds: string[]
  budgets: { stepsUsed: number; tokensUsed: number; fullReads: number }
  updatedAt: number
}

export type AgentRole = string

export type BusEvent =
  | { type: 'mission-start'; objective: string }
  | { type: 'plan-step'; n: number; total: number; thought: string; decision?: { routes: string[]; artifactRefs?: string[] } }
  | { type: 'dispatch'; from: string; to: string; tag?: string; artifactRef?: string }
  | { type: 'agent-start'; agent: string }
  | { type: 'token'; agent: string; text: string }
  | { type: 'agent-done'; agent: string }
  | { type: 'tool-call'; agent: string; tool: string; input: string }
  | { type: 'tool-result'; agent: string; tool: string; ok: boolean }
  | { type: 'mission-complete'; final: string; artifactId?: string; verified?: boolean }
  | { type: 'fault'; agent: string; error: string }
  | { type: 'artifact-stored'; id: string; agent: string; kind: string; summary: string }
  | { type: 'gate-start'; gate: string; detail?: string }
  | { type: 'gate-pass'; gate: string; detail?: string }
  | { type: 'gate-fail'; gate: string; detail?: string }
  | { type: 'policy-applied'; agent: string; policy: string; detail: string }
  | { type: 'convergence'; reason: 'dry-rounds' | 'budget' | 'step-cap'; rounds: number }
  | { type: 'jury-vote'; agent: string; model: string; verdict: string }
  | { type: 'approval-requested'; missionId: string; artifactId: string; summary: string }
  | { type: 'approval-resolved'; decision: 'approved' | 'rejected'; feedback?: string }
  | { type: 'checkpoint-updated'; missionId: string; step: number; status: 'running' | 'paused' | 'awaiting-approval' | 'interrupted' }
  | { type: 'resume-available'; missionId: string; step: number }

export interface Plan {
  thought: string
  dispatch: { agent: string; task: string }[]
  final: string | null
}

export interface MissionRecord {
  id?: number
  objective: string
  endedAt: number
  steps: number
  tokens: number
  artifact: string
}
