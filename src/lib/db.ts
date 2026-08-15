import Dexie, { type Table } from 'dexie'

export interface MissionRow {
  id?: number
  objective: string
  endedAt: number
  steps: number
  tokens: number
  artifact: string
}

export interface ArtifactRecord {
  id: string
  missionId: string
  nodeId: string
  kind: 'research' | 'analysis' | 'draft' | 'critique' | 'final' | 'raw'
  summary: string
  content: string
  createdAt: number
}

export interface CheckpointRecord {
  missionId: string
  status: 'running' | 'paused' | 'awaiting-approval' | 'interrupted'
  currentStep: number
  completedNodes: string[]
  decisions: Array<{ step: number; thought: string; routes: string[] }>
  artifactIds: string[]
  budgets: { stepsUsed: number; tokensUsed: number; fullReads: number }
  updatedAt: number
}

class AxiomDB extends Dexie {
  missions!: Table<MissionRow>
  artifacts!: Table<ArtifactRecord>
  checkpoints!: Table<CheckpointRecord>

  constructor() {
    super('axiom')
    this.version(1).stores({
      missions: '++id, endedAt',
      artifacts: 'id, missionId, nodeId, kind, createdAt',
      checkpoints: 'missionId, status, updatedAt',
    })
  }
}

export const db = new AxiomDB()
