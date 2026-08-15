import { describe, it, expect } from 'vitest'
import { mergeShards } from '../src/engine/orchestrator'

describe('mergeShards', () => {
  it('merges 3 parallel writer shards with overlapping headers into clean deduped output', () => {
    const shards = [
      { id: 's1', summary: 'Intro', content: JSON.stringify({ sections: [{ heading: 'Introduction', body: 'First intro paragraph.' }] }), shardIndex: 0 },
      { id: 's2', summary: 'Methods', content: JSON.stringify({ sections: [{ heading: 'Methods', body: 'Methods description.' }, { heading: 'Introduction', body: 'Duplicate intro.' }] }), shardIndex: 1 },
      { id: 's3', summary: 'Results', content: JSON.stringify({ sections: [{ heading: 'Results', body: 'Results text.' }] }), shardIndex: 2 },
    ]
    const merged = mergeShards(shards)
    expect(merged.content).toContain('Introduction')
    expect(merged.content).toContain('Methods')
    expect(merged.content).toContain('Results')
    const introCount = (merged.content.match(/Introduction/g) || []).length
    expect(introCount).toBe(1)
  })
})
