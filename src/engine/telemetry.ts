export interface Timing {
  serialMs: number
  parallelMs: number
  totalMs: number
  maxConcurrentWorkers: number
}

export interface Telemetry {
  actualSpeedup: number | null
  theoreticalSpeedup: number | null
}

export function amdahlTheoreticalSpeedup(timing: Timing): number | null {
  if (timing.totalMs <= 0) return null
  const p = Math.max(0, Math.min(1, timing.parallelMs / timing.totalMs))
  const n = Math.max(1, timing.maxConcurrentWorkers)
  const s = 1 / ((1 - p) + p / n)
  return Math.round(s * 100) / 100
}

export function amdahlActualSpeedup(timing: Timing): number | null {
  if (timing.totalMs <= 0) return null
  const estimatedSequential = timing.serialMs + timing.parallelMs
  const speedup = estimatedSequential / timing.totalMs
  return Math.round(speedup * 100) / 100
}

export function calculateTelemetry(timing: Timing): Telemetry {
  return {
    actualSpeedup: amdahlActualSpeedup(timing),
    theoreticalSpeedup: amdahlTheoreticalSpeedup(timing),
  }
}
