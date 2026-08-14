export type AgentRole =
  | 'orchestrator'
  | 'researcher'
  | 'analyst'
  | 'writer'
  | 'critic'

export interface AgentDef {
  id: string
  label: string
  role: AgentRole
  model: string
  system: string
  state: 'idle' | 'running' | 'done' | 'fault'
}

export interface AgentTask {
  agent: string
  task: string
}

export interface PlanStep {
  thought: string
  dispatch: AgentTask[]
  final: string | null
}

export interface DispatchEvent {
  from: string
  to: string
  tag: string
}

export type BusEvent =
  | { type: 'mission-start'; objective: string }
  | { type: 'plan-step'; n: number; total: number; thought: string }
  | { type: 'dispatch'; from: string; to: string; tag: string }
  | { type: 'agent-start'; agent: string }
  | { type: 'token'; agent: string; text: string }
  | { type: 'agent-done'; agent: string }
  | { type: 'fault'; agent: string; error: string }
  | { type: 'mission-complete'; final: string }
  | { type: 'log'; tag: string; text: string; sys?: boolean }

export interface MissionRecord {
  id?: number
  objective: string
  endedAt: number
  steps: number
  tokens: number
  artifact: string
}

export interface VaultBalance {
  usage: number
  limit: number
  label: string
}
