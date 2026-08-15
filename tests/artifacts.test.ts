import { describe, it, expect } from 'vitest'
import { structuredSummaryForRole, safeParseWithRepair, truncateSummary, SchemaWriter } from '../src/engine/artifacts'

describe('artifacts', () => {
  it('truncates long summaries', () => {
    const long = 'a'.repeat(600)
    expect(truncateSummary(long).length).toBeLessThanOrEqual(500)
  })

  it('structuredSummaryForRole parses valid JSON for writer', () => {
    const raw = '{"sections":[{"heading":"A","body":"B"}]}'
    const { summary, structured } = structuredSummaryForRole('writer', raw)
    expect(structured).toEqual({ sections: [{ heading: 'A', body: 'B' }] })
    expect(summary.length).toBeGreaterThan(0)
  })

  it('structuredSummaryForRole falls back to truncated raw text', () => {
    const raw = 'this is not json'
    const { summary, structured } = structuredSummaryForRole('writer', raw)
    expect(structured).toBeNull()
    expect(summary).toBe(raw.slice(0, 500))
  })

  it('safeParseWithRepair repairs array into writer sections', () => {
    const result = safeParseWithRepair(SchemaWriter, '{"sections":[{"heading":"A","body":"B"}]}')
    expect(result.ok).toBe(true)
    expect(result.data).toEqual({ sections: [{ heading: 'A', body: 'B' }] })
  })
})
