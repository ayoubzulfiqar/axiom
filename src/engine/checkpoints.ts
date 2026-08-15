import bus from './bus'
import type { CheckpointRecord } from './types'

export interface MissionCheckpoint {
  missionId: string
  status: CheckpointRecord['status']
  currentStep: number
  completedNodes: string[]
  decisions: Array<{ step: number; thought: string; routes: string[] }>
  artifactIds: string[]
  budgets: { stepsUsed: number; tokensUsed: number; fullReads: number }
  updatedAt: number
}

const memoryStore = new Map<string, MissionCheckpoint>()

function storageAvailable(): boolean {
  try {
    const k = '__axiom_storage_test__'
    localStorage.setItem(k, k)
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export function emptyCheckpoint(missionId: string): MissionCheckpoint {
  return {
    missionId,
    status: 'running',
    currentStep: 0,
    completedNodes: [],
    decisions: [],
    artifactIds: [],
    budgets: { stepsUsed: 0, tokensUsed: 0, fullReads: 0 },
    updatedAt: Date.now(),
  }
}

export async function upsertCheckpoint(cp: MissionCheckpoint): Promise<void> {
  const payload: MissionCheckpoint = { ...cp, updatedAt: Date.now() }
  if (storageAvailable()) {
    localStorage.setItem(`axiom.checkpoint.${cp.missionId}`, JSON.stringify(payload))
  }
  memoryStore.set(cp.missionId, payload)
  bus.emit({ type: 'checkpoint-updated', missionId: cp.missionId, step: cp.currentStep, status: cp.status })
}

export function loadCheckpoint(missionId: string): MissionCheckpoint | null {
  if (storageAvailable()) {
    const raw = localStorage.getItem(`axiom.checkpoint.${missionId}`)
    if (raw) {
      try {
        return JSON.parse(raw) as MissionCheckpoint
      } catch {
        return null
      }
    }
  }
  return memoryStore.get(missionId) ?? null
}

export function clearCheckpoint(missionId: string): void {
  if (storageAvailable()) {
    localStorage.removeItem(`axiom.checkpoint.${missionId}`)
  }
  memoryStore.delete(missionId)
}

export function resetCheckpoints() {
  memoryStore.clear()
}
