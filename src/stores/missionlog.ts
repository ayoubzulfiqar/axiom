import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'

export interface MissionLogEntry {
  id: string
  objective: string
  status: string
  startedAt: number
  endedAt?: number
  verified?: boolean | null
  decisions: number
}

const STORAGE_KEY = 'axiom.missionlog'

function load(): MissionLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MissionLogEntry[]
  } catch {
    /* ignore */
  }
  return []
}

function persist(list: MissionLogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)))
  } catch {
    /* ignore */
  }
}

let counter = 0

export interface MissionLogState {
  entries: MissionLogEntry[]
}

export const useMissionLog = create<MissionLogState>(() => ({
  entries: load(),
}))

export function bindMissionLog() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'mission-start') {
      const entry: MissionLogEntry = {
        id: `m${Date.now()}-${counter++}`,
        objective: ev.objective,
        status: 'running',
        startedAt: Date.now(),
        decisions: 0,
      }
      const next = [entry, ...useMissionLog.getState().entries]
      useMissionLog.setState({ entries: next })
      persist(next)
    }
    if (ev.type === 'plan-step') {
      const list = useMissionLog.getState().entries
      if (list.length === 0) return
      const head = { ...list[0], decisions: ev.n }
      const next = [head, ...list.slice(1)]
      useMissionLog.setState({ entries: next })
      persist(next)
    }
    if (ev.type === 'mission-complete' || ev.type === 'fault') {
      const list = useMissionLog.getState().entries
      if (list.length === 0) return
      const head = {
        ...list[0],
        status: ev.type === 'mission-complete' ? 'complete' : 'fault',
        endedAt: Date.now(),
        verified: ev.type === 'mission-complete' ? (ev as any).verified ?? null : null,
      }
      const next = [head, ...list.slice(1)]
      useMissionLog.setState({ entries: next })
      persist(next)
    }
  })
}
