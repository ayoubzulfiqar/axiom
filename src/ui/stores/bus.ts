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
  graphOpen: boolean
  setGraphOpen: (v: boolean) => void
  approvalOpen: boolean
  setApprovalOpen: (v: boolean) => void
  approvalPreview: string | null
  setApprovalPreview: (v: string | null) => void
  artifactOpen: boolean
  setArtifactOpen: (v: boolean) => void
  simMode: boolean
  setSimMode: (v: boolean) => void
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
  graphOpen: false,
  setGraphOpen: (v) => set({ graphOpen: v }),
  approvalOpen: false,
  setApprovalOpen: (v) => set({ approvalOpen: v }),
  approvalPreview: null,
  setApprovalPreview: (v) => set({ approvalPreview: v }),
  artifactOpen: false,
  setArtifactOpen: (v) => set({ artifactOpen: v }),
  simMode: false,
  setSimMode: (v) => set({ simMode: v }),
}))

bus.on((ev: BusEvent) => {
  if (ev.type === 'mission-complete') useBus.setState({ artifact: ev.final, objectiveOpen: false, artifactOpen: true })
  if (ev.type === 'approval-requested') useBus.setState({ approvalOpen: true, approvalPreview: ev.summary })
  if (ev.type === 'approval-resolved') {
    if (ev.decision === 'approved') {
      useBus.setState({ approvalOpen: false, artifactOpen: true, artifact: useBus.getState().approvalPreview })
    } else {
      useBus.setState({ approvalOpen: false })
    }
  }
  if (ev.type === 'mission-start') useBus.setState({ approvalOpen: false, approvalPreview: null, artifactOpen: false, artifact: null })
})
