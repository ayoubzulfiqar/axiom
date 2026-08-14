import type { AgentDef, AgentRole } from './types'
import { loadModelOverrides } from './vault'

export interface DefOverrides {
  [id: string]: string
}

export const DEFAULT_AGENT_DEFS: Omit<AgentDef, 'id' | 'state'>[] = [
  {
    label: 'ORCHESTRATOR',
    role: 'orchestrator',
    model: 'anthropic/claude-3.5-sonnet',
    system: 'You are AXIOM Orchestrator. Output only JSON with keys thought, dispatch (max 3), final (null or string).',
  },
  {
    label: 'RESEARCHER',
    role: 'researcher',
    model: 'openai/gpt-4o-mini',
    system: 'You are AXIOM Researcher. Return concise findings. Use web_search when helpful.',
    tools: ['web_search'],
  },
  {
    label: 'ANALYST',
    role: 'analyst',
    model: 'google/gemini-flash-1.5',
    system: 'You are AXIOM Analyst. Provide structured analysis. Use code_exec for calculations.',
    tools: ['code_exec'],
  },
  {
    label: 'WRITER',
    role: 'writer',
    model: 'anthropic/claude-3.5-haiku',
    system: 'You are AXIOM Writer. Produce clear prose.',
  },
  {
    label: 'CRITIC',
    role: 'critic',
    model: 'openai/gpt-4o',
    system: 'You are AXIOM Critic. Critique and suggest improvements.',
  },
]

let counter = 0
const defs = new Map<string, AgentDef>()
const overrides: DefOverrides = {}

export function initDefs(seedIds?: string[]) {
  defs.clear()
  counter = 0
  const ids = seedIds && seedIds.length ? seedIds : DEFAULT_AGENT_DEFS.map(() => `AGENT-${String(counter++).padStart(2, '0')}`)
  const base = DEFAULT_AGENT_DEFS.slice(0, ids.length)
  for (let i = 0; i < base.length; i++) {
    const id = ids[i]
    defs.set(id, { id, ...base[i], state: 'idle' })
  }
  Object.assign(overrides, loadModelOverrides())
}

export function getDefs(): AgentDef[] {
  return Array.from(defs.values())
}

export function getDef(id: string): AgentDef | undefined {
  return defs.get(id)
}

export function setAgentState(id: string, state: AgentDef['state']) {
  const def = defs.get(id)
  if (def) def.state = state
}

export function applyModelOverride(id: string, model: string) {
  overrides[id] = model
  const def = defs.get(id)
  if (def) def.model = model
  saveOverrides()
}

export function getModel(id: string): string {
  return overrides[id] ?? defs.get(id)?.model ?? ''
}

export function spawnAgent(label?: string): AgentDef {
  const id = `AGENT-${String(counter++).padStart(2, '0')}`
  const role: AgentRole = 'analyst'
  const def: AgentDef = {
    id,
    label: label ?? `SPAWN-${counter}`,
    role,
    model: 'openai/gpt-4o-mini',
    system: 'You are a dynamic AXIOM agent. Execute the given task concisely.',
    state: 'idle',
  }
  defs.set(id, def)
  return def
}

function saveOverrides() {
  try {
    const merged: Record<string, string> = {}
    for (const def of defs.values()) merged[def.id] = def.model
    localStorage.setItem('axiom.overrides', JSON.stringify(merged))
  } catch {}
}

export function resetMesh() {
  initDefs()
}
