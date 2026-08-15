import Dexie from 'dexie'
import type { ArtifactRecord, CheckpointRecord } from './types'
import type { ChunkRecord } from '../lib/db'
import bus from './bus'

export class ArtifactStore {
  private db: Dexie

  constructor(db: Dexie) {
    this.db = db
  }

  async put(record: ArtifactRecord): Promise<void> {
    const id = record.id ?? crypto.randomUUID()
    const payload = { ...record, id }
    await this.db.table('artifacts').put(payload)
    bus.emit({ type: 'artifact-stored', id: payload.id, agent: payload.nodeId, kind: payload.kind, summary: payload.summary })
  }

  async byMission(missionId: string): Promise<ArtifactRecord[]> {
    return this.db.table<ArtifactRecord>('artifacts').where('missionId').equals(missionId).toArray()
  }

  async byNode(nodeId: string): Promise<ArtifactRecord[]> {
    return this.db.table<ArtifactRecord>('artifacts').where('nodeId').equals(nodeId).toArray()
  }

  async get(id: string): Promise<ArtifactRecord | undefined> {
    return this.db.table<ArtifactRecord>('artifacts').get(id)
  }
}

export class CheckpointStore {
  private db: Dexie

  constructor(db: Dexie) {
    this.db = db
  }

  async upsert(record: CheckpointRecord): Promise<void> {
    await this.db.table<CheckpointRecord>('checkpoints').put(record)
    bus.emit({ type: 'checkpoint-updated', missionId: record.missionId, step: record.currentStep, status: record.status })
  }

  async get(missionId: string): Promise<CheckpointRecord | undefined> {
    return this.db.table<CheckpointRecord>('checkpoints').get(missionId)
  }

  async running(): Promise<CheckpointRecord[]> {
    return this.db.table<CheckpointRecord>('checkpoints').where('status').anyOf(['running', 'paused', 'awaiting-approval']).toArray()
  }

  async clear(missionId: string): Promise<void> {
    await this.db.table<CheckpointRecord>('checkpoints').delete(missionId)
  }
}

export class ChunkStore {
  private db: Dexie

  constructor(db: Dexie) {
    this.db = db
  }

  async put(record: ChunkRecord): Promise<void> {
    const payload = { ...record, id: record.id }
    await this.db.table('chunks').put(payload)
  }

  async byScope(missionScope: 'global' | string): Promise<ChunkRecord[]> {
    return this.db.table<ChunkRecord>('chunks').where('missionScope').equals(missionScope).toArray()
  }

  async clear(missionScope?: 'global' | string): Promise<void> {
    if (typeof missionScope === 'string') {
      await this.db.table<ChunkRecord>('chunks').where('missionScope').equals(missionScope).delete()
    } else {
      await this.db.table<ChunkRecord>('chunks').clear()
    }
  }
}

