export interface AgentDef {
  id: string
  label: string
  role: string
  model: string
  system: string
  state: 'idle' | 'running' | 'done' | 'fault'
  tools?: string[]
}

export type AgentRole = string

export type BusEvent =
  | { type: 'mission-start'; objective: string }
  | { type: 'plan-step'; n: number; total: number; thought: string }
  | { type: 'dispatch'; from: string; to: string; tag?: string }
  | { type: 'agent-start'; agent: string }
  | { type: 'token'; agent: string; text: string }
  | { type: 'agent-done'; agent: string }
  | { type: 'tool-call'; agent: string; tool: string; input: string }
  | { type: 'tool-result'; agent: string; tool: string; ok: boolean }
  | { type: 'mission-complete'; final: string }
  | { type: 'fault'; agent: string; error: string }

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
