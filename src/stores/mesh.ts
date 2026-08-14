import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'
import { getDefs, setAgentState, resetMesh } from '../engine/agents'

export interface MeshState {
  roster: Record<string, { id: string; label: string; state: string; role: string; tasks: string[]; model: string; tools?: string[] }>
  selectedId: string | null
  setSelected: (id: string | null) => void
}

export const useMeshStore = create<MeshState>((set) => ({
  roster: {},
  selectedId: null,
  setSelected: (id) => set({ selectedId: id }),
}))

function rebuildRoster() {
  const roster: Record<string, { id: string; label: string; state: string; role: string; tasks: string[]; model: string; tools?: string[] }> = {}
  for (const def of getDefs()) {
    roster[def.id] = {
      id: def.id,
      label: def.label,
      state: def.state,
      role: def.role,
      tasks: [],
      model: def.model,
      tools: def.tools,
    }
  }
  useMeshStore.setState({ roster })
}

bus.on((ev: BusEvent) => {
  if (ev.type === 'mission-start') {
    rebuildRoster()
    useMeshStore.setState({ selectedId: null })
  }
  if (ev.type === 'agent-start') { setAgentState(ev.agent, 'running'); rebuildRoster() }
  if (ev.type === 'agent-done') { setAgentState(ev.agent, 'done'); rebuildRoster() }
  if (ev.type === 'fault') { setAgentState(ev.agent, 'fault'); rebuildRoster() }
  if (ev.type === 'mission-complete') { rebuildRoster() }
})

export function resetMeshStore() {
  resetMesh()
  rebuildRoster()
  useMeshStore.setState({ selectedId: null })
}
