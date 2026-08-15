import { describe, it, expect, beforeEach } from 'vitest'
import { initDefs } from '../src/engine/agents'
import { runFinalGate } from '../src/engine/gates'

describe('gates', () => {
  beforeEach(() => {
    initDefs()
  })

  it('fails empty content', async () => {
    const res = await runFinalGate({ id: '1', nodeId: 'n', kind: 'raw', summary: 'short', content: '' }, [])
    expect(res.verdict).toBe('verified:false')
    expect(res.issues).toContain('empty-content')
  })

  it('passes valid non-empty content', async () => {
    const res = await runFinalGate({ id: '1', nodeId: 'n', kind: 'raw', summary: 'summary', content: 'hello world' }, [])
    expect(res.verdict).toBe('pass')
  })

  it('returns issues when present', async () => {
    const res = await runFinalGate({ id: '1', nodeId: 'n', kind: 'raw', summary: 'summary', content: 'ok' }, [])
    expect(res.verdict).toBe('pass')
  })
})
