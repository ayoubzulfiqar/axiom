import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'

export interface MissionState {
  status: 'standby' | 'running' | 'paused' | 'complete' | 'fault'
  objective: string
  step: number
  total: number
  startedAt: number | null
  fault: string | null
}

export const useMissionStore = create<MissionState>(() => ({
  status: 'standby',
  objective: '',
  step: 0,
  total: 0,
  startedAt: null,
  fault: null,
}))

export function bindMissionBus() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'mission-start') {
      useMissionStore.setState({ status: 'running', objective: ev.objective, startedAt: Date.now(), fault: null })
    }
    if (ev.type === 'plan-step') {
      useMissionStore.setState({ step: ev.n, total: ev.total })
    }
    if (ev.type === 'mission-complete') {
      useMissionStore.setState({ status: 'complete' })
    }
    if (ev.type === 'fault') {
      useMissionStore.setState({ status: 'fault', fault: ev.error })
    }
  })
}
