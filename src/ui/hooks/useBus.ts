import { create } from 'zustand'
import bus from '../../engine/bus'
import type { BusEvent } from '../../engine/types'

export interface BusState {
  booted: boolean
  artifact: string | null
  objectiveOpen: boolean
  historyOpen: boolean
  vaultOpen: boolean
  setBooted: (v: boolean) => void
  setArtifact: (v: string | null) => void
  setObjectiveOpen: (v: boolean) => void
  setHistoryOpen: (v: boolean) => void
  setVaultOpen: (v: boolean) => void
}

export const useBus = create<BusState>((set) => ({
  booted: false,
  artifact: null,
  objectiveOpen: false,
  historyOpen: false,
  vaultOpen: false,
  setBooted: (v) => set({ booted: v }),
  setArtifact: (v) => set({ artifact: v }),
  setObjectiveOpen: (v) => set({ objectiveOpen: v }),
  setHistoryOpen: (v) => set({ historyOpen: v }),
  setVaultOpen: (v) => set({ vaultOpen: v }),
}))

export function bindBus() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'mission-complete') {
      useBus.setState({ artifact: ev.final })
    }
  })
}
