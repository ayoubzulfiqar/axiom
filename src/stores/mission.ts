import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'

export interface MissionState {
  status: 'standby' | 'running' | 'paused' | 'complete' | 'fault' | 'awaiting-approval'
  objective: string
  step: number
  total: number
  startedAt: number | null
  fault: string | null
  currentArtifactId: string | null
  verified: boolean | null
  decisions: Array<{ step: number; thought: string; routes: string[] }>
}

export const useMissionStore = create<MissionState>(() => ({
  status: 'standby',
  objective: '',
  step: 0,
  total: 0,
  startedAt: null,
  fault: null,
  currentArtifactId: null,
  verified: null,
  decisions: [],
}))

export function bindMissionBus() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'mission-start') {
      useMissionStore.setState({ status: 'running', objective: ev.objective, startedAt: Date.now(), fault: null, currentArtifactId: null, verified: null })
    }
    if (ev.type === 'plan-step') {
      useMissionStore.setState({ step: ev.n, total: ev.total })
    }
    if (ev.type === 'mission-complete') {
      useMissionStore.setState({ status: 'complete', currentArtifactId: ev.artifactId ?? null, verified: ev.verified ?? null })
    }
    if (ev.type === 'fault') {
      useMissionStore.setState({ status: 'fault', fault: ev.error })
    }
    if (ev.type === 'approval-requested') {
      useMissionStore.setState({ status: 'awaiting-approval' })
    }
  })
}
