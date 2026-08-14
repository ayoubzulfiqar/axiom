import { describe, it, expect } from 'vitest'
import { parsePlan, extractFirstObject } from '../src/engine/protocol'

describe('extractFirstObject', () => {
  it('extracts JSON object from text', () => {
    const text = 'Here is the plan: {"thought":"ok","dispatch":[],"final":null} thanks'
    expect(extractFirstObject(text)).toBe('{"thought":"ok","dispatch":[],"final":null}')
  })

  it('returns null when no braces', () => {
    expect(extractFirstObject('no json here')).toBeNull()
  })
})

describe('parsePlan', () => {
  it('parses clean JSON', () => {
    const raw = '{"thought":"step 1","dispatch":[{"agent":"R1","task":"research"}],"final":null}'
    const result = parsePlan(raw)
    expect(result.ok).toBe(true)
    expect(result.plan.thought).toBe('step 1')
    expect(result.plan.dispatch).toHaveLength(1)
    expect(result.plan.final).toBeNull()
  })

  it('parses fenced JSON', () => {
    const raw = '```json\n{"thought":"ok","dispatch":[],"final":"done"}\n```'
    const result = parsePlan(raw)
    expect(result.ok).toBe(true)
    expect(result.plan.final).toBe('done')
  })

  it('rejects truncated JSON', () => {
    const raw = '{"thought":"ok","dispatch":'
    const result = parsePlan(raw)
    expect(result.ok).toBe(false)
  })

  it('repairs garbage with correction message', () => {
    const raw = 'This is not JSON at all.'
    const result = parsePlan(raw)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('no JSON object found')
  })
})
