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
  telemetry: { actualSpeedup: number | null; theoreticalSpeedup: number | null; serialMs: number; parallelMs: number; totalMs: number }
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
  telemetry: { actualSpeedup: null, theoreticalSpeedup: null, serialMs: 0, parallelMs: 0, totalMs: 0 },
}))

export function bindMissionBus() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'mission-start') {
      useMissionStore.setState({ status: 'running', objective: ev.objective, startedAt: Date.now(), fault: null, currentArtifactId: null, verified: null, decisions: [] })
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
    if (ev.type === 'telemetry-updated') {
      const { serialMs, parallelMs, totalMs, maxConcurrentWorkers } = ev
      useMissionStore.setState({
        telemetry: {
          actualSpeedup: totalMs > 0 ? Number(((serialMs + parallelMs) / totalMs).toFixed(2)) : null,
          theoreticalSpeedup: totalMs > 0 ? Number((1 / ((1 - Math.max(0, Math.min(1, parallelMs / totalMs))) + Math.max(0, Math.min(1, parallelMs / totalMs)) / Math.max(1, maxConcurrentWorkers))).toFixed(2)) : null,
          serialMs,
          parallelMs,
          totalMs,
        },
      })
    }
  })
}
