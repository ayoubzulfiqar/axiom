import { describe, it, expect } from 'vitest'
import { calculateTelemetry } from '../src/engine/telemetry'

describe('telemetry', () => {
  it('calculates actual and theoretical speedup', () => {
    const telemetry = calculateTelemetry({ serialMs: 1000, parallelMs: 1000, totalMs: 1500, maxConcurrentWorkers: 4 })
    expect(telemetry.actualSpeedup).toBeCloseTo(1.33, 1)
    expect(telemetry.theoreticalSpeedup).toBeCloseTo(2.0, 1)
  })

  it('returns nulls when totalMs is zero', () => {
    const telemetry = calculateTelemetry({ serialMs: 0, parallelMs: 0, totalMs: 0, maxConcurrentWorkers: 4 })
    expect(telemetry.actualSpeedup).toBeNull()
    expect(telemetry.theoreticalSpeedup).toBeNull()
  })
})
