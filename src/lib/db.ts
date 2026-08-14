import Dexie, { type Table } from 'dexie'

export interface MissionRow {
  id?: number
  objective: string
  endedAt: number
  steps: number
  tokens: number
  artifact: string
}

class AxiomDB extends Dexie {
  missions!: Table<MissionRow>

  constructor() {
    super('axiom')
    this.version(1).stores({
      missions: '++id, endedAt',
    })
  }
}

export const db = new AxiomDB()
