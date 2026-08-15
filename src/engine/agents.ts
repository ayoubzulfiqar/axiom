import type { AgentDef, AgentRole } from './types'
import { loadModelOverrides } from './vault'
import { AGENT_OUTPUT_SCHEMAS } from './artifacts'

export interface DefOverrides {
  [id: string]: string
}

export const DEFAULT_AGENT_DEFS: Omit<AgentDef, 'id' | 'state'>[] = [
  {
    label: 'ORCHESTRATOR',
    role: 'orchestrator',
    model: 'anthropic/claude-3.5-sonnet',
    system: 'You are AXIOM Orchestrator. Output only JSON with keys thought, dispatch (max 3), final (null or string).',
    outputSchema: undefined,
    failure: 'PLAN_PARSE_FAIL',
    policy: { retries: 0, onFail: 'stop' },
  },
  {
    label: 'RESEARCHER',
    role: 'researcher',
    model: 'openai/gpt-4o-mini',
    system: 'You are AXIOM Researcher. Return concise findings. Use web_search when helpful.\nReply ONLY with JSON matching the schema:\n{"claims":[{"claim":string,"source_url?":string,"confidence":"high"|"medium"|"low"}]}',
    tools: ['web_search'],
    outputSchema: AGENT_OUTPUT_SCHEMAS.researcher,
    failure: 'NO_CLAIMS',
    policy: { retries: 1, onFail: 'skip' },
  },
  {
    label: 'ANALYST',
    role: 'analyst',
    model: 'google/gemini-flash-1.5',
    system: 'You are AXIOM Analyst. Provide structured analysis. Use code_exec for calculations.\nReply ONLY with JSON matching the schema:\n{"findings":[string],"metrics?":Record<string,string>,"conclusion":string}',
    tools: ['code_exec'],
    outputSchema: AGENT_OUTPUT_SCHEMAS.analyst,
    failure: 'NO_FINDINGS',
    policy: { retries: 2, onFail: 'retry' },
  },
  {
    label: 'WRITER',
    role: 'writer',
    model: 'anthropic/claude-3.5-haiku',
    system: 'You are AXIOM Writer. Produce clear prose.\nReply ONLY with JSON matching the schema:\n{"sections":[{"heading":string,"body":string}]}',
    outputSchema: AGENT_OUTPUT_SCHEMAS.writer,
    failure: 'EMPTY_DRAFT',
    policy: { retries: 1, onFail: 'repair' },
  },
  {
    label: 'CRITIC',
    role: 'critic',
    model: 'openai/gpt-4o',
    system: 'You are AXIOM Critic. Critique and suggest improvements.\nReply ONLY with JSON matching the schema:\n{"verdict":"pass"|"fail","issues":[string]}',
    outputSchema: AGENT_OUTPUT_SCHEMAS.critic,
    failure: 'CRITIC_UNAVAILABLE',
    policy: { retries: 2, fallbackModel: 'openai/gpt-4o-mini', onFail: 'fallback' },
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
    const def: AgentDef = {
      id,
      ...base[i],
      state: 'idle',
    }
    defs.set(id, def)
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
    outputSchema: AGENT_OUTPUT_SCHEMAS.analyst,
    failure: 'SPAWN_FAIL',
    policy: { retries: 1, onFail: 'retry' },
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
