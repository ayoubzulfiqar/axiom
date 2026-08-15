import { describe, it, expect } from 'vitest'

describe('convergence', () => {
  it('stops after two dry rounds', () => {
    const seen = new Set<string>()
    let dryRounds = 0
    const rounds: string[] = []
    const items = ['x', 'y', 'x', 'y']
    for (const item of items) {
      if (seen.has(item)) {
        dryRounds++
      } else {
        seen.add(item)
        dryRounds = 0
      }
      rounds.push(`${item}:${dryRounds}`)
      if (dryRounds >= 2) break
    }
    expect(rounds).toEqual(['x:0', 'y:0', 'x:1', 'y:2'])
    expect(dryRounds).toBe(2)
  })
})
