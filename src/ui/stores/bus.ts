import { create } from 'zustand'
import bus from '../../engine/bus'
import type { BusEvent } from '../../engine/types'

export interface BusUIState {
  booted: boolean
  setBooted: (v: boolean) => void
  artifact: string | null
  objectiveOpen: boolean
  setObjectiveOpen: (v: boolean) => void
  rosterOpen: boolean
  setRosterOpen: (v: boolean) => void
  historyOpen: boolean
  setHistoryOpen: (v: boolean) => void
  detailOpen: boolean
  setDetailOpen: (v: boolean) => void
  vaultOpen: boolean
  setVaultOpen: (v: boolean) => void
}

export const useBus = create<BusUIState>((set) => ({
  booted: false,
  setBooted: (v) => set({ booted: v }),
  artifact: null,
  objectiveOpen: false,
  setObjectiveOpen: (v) => set({ objectiveOpen: v }),
  rosterOpen: false,
  setRosterOpen: (v) => set({ rosterOpen: v }),
  historyOpen: false,
  setHistoryOpen: (v) => set({ historyOpen: v }),
  detailOpen: false,
  setDetailOpen: (v) => set({ detailOpen: v }),
  vaultOpen: false,
  setVaultOpen: (v) => set({ vaultOpen: v }),
}))

bus.on((ev: BusEvent) => {
  if (ev.type === 'mission-complete') useBus.setState({ artifact: ev.final, objectiveOpen: false })
})
