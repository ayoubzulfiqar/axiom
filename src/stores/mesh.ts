import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'
import type { AgentDef } from '../engine/types'
import { getDefs, setAgentState, resetMesh } from '../engine/agents'

export interface MeshAgent {
  id: string
  label: string
  role: string
  state: 'idle' | 'running' | 'done' | 'fault'
  model: string
  tasks: string[]
}

export interface MeshState {
  roster: Record<string, MeshAgent>
  selectedId: string | null
}

function mapAgent(a: AgentDef): MeshAgent {
  return {
    id: a.id,
    label: a.label,
    role: a.role,
    state: a.state,
    model: a.model,
    tasks: [],
  }
}

export const useMeshStore = create<MeshState>(() => {
  const defs = getDefs()
  const roster: Record<string, MeshAgent> = {}
  for (const d of defs) roster[d.id] = mapAgent(d)
  return { roster, selectedId: null }
})

export function bindMeshBus() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'agent-start') {
      useMeshStore.setState((s) => ({
        roster: { ...s.roster, [ev.agent]: { ...s.roster[ev.agent], state: 'running' } },
      }))
      setAgentState(ev.agent, 'running')
    }
    if (ev.type === 'agent-done') {
      useMeshStore.setState((s) => ({
        roster: { ...s.roster, [ev.agent]: { ...s.roster[ev.agent], state: 'done' } },
      }))
      setAgentState(ev.agent, 'done')
    }
    if (ev.type === 'fault') {
      useMeshStore.setState((s) => ({
        roster: { ...s.roster, [ev.agent]: { ...s.roster[ev.agent], state: 'fault' } },
      }))
      setAgentState(ev.agent, 'fault')
    }
    if (ev.type === 'mission-start') {
      resetMesh()
      const defs = getDefs()
      const roster: Record<string, MeshAgent> = {}
      for (const d of defs) roster[d.id] = mapAgent(d)
      useMeshStore.setState({ roster, selectedId: null })
    }
  })
}

export function setMeshSelected(id: string | null) {
  useMeshStore.setState({ selectedId: id })
}

export function setMeshModel(agentId: string, model: string) {
  useMeshStore.setState((s) => ({
    roster: { ...s.roster, [agentId]: { ...s.roster[agentId], model } },
  }))
}
