import bus from './bus'
import { getDefs, setAgentState, initDefs } from './agents'
import { abortAll } from './orchestrator'
import { runFinalGate } from './gates'
import { emitPolicyApplied } from './policies'
import { simulateCost } from './cost'

export type Speed = 1 | 2 | 4

export type GraphShape = 'standard' | 'deep-research' | 'adversarial' | 'broad-sweep'

export interface GraphShapeConfig {
  id: GraphShape
  label: string
  description: string
  maxDispatches: number
  gateMode: 'default' | 'strict'
  convergenceRequired: boolean
  maxRepairLoops: number
}

export const GRAPH_SHAPES: Record<GraphShape, GraphShapeConfig> = {
  standard: { id: 'standard', label: 'Standard', description: '1-3 dispatches per step, single critic gate.', maxDispatches: 3, gateMode: 'default', convergenceRequired: false, maxRepairLoops: 2 },
  'deep-research': { id: 'deep-research', label: 'Deep Research', description: 'High fan-out up to 5 parallel researchers, mandatory convergence, strict gate.', maxDispatches: 5, gateMode: 'strict', convergenceRequired: true, maxRepairLoops: 2 },
  adversarial: { id: 'adversarial', label: 'Adversarial Review', description: 'Generator immediately followed by hostile verifier in tight cycle. Max 3 repair loops.', maxDispatches: 2, gateMode: 'strict', convergenceRequired: false, maxRepairLoops: 3 },
  'broad-sweep': { id: 'broad-sweep', label: 'Broad Sweep', description: 'Convergence-focused discovery loop until 2 consecutive dry rounds.', maxDispatches: 4, gateMode: 'default', convergenceRequired: true, maxRepairLoops: 2 },
}

let speed: Speed = 1
let active = false
let timers: ReturnType<typeof setTimeout>[] = []

export function setSpeed(s: Speed) {
  speed = s
}

export function getSpeed(): Speed {
  return speed
}

export function runSimulation(objective: string, shape: string = 'standard') {
  initDefs()
  bus.emit({ type: 'mission-start', objective })
  active = true

  const defs = getDefs()
  const orchestrator = defs[0]
  const workers = defs.slice(1)

  const t = (ms: number) => ms / speed

  if (shape === 'adversarial') {
    timers.push(
      setTimeout(() => {
        if (!active) return
        bus.emit({ type: 'plan-step', n: 1, total: 2, thought: 'Adversarial review: generate then verify.' })
        const writer = workers.find((d) => d.role === 'writer') ?? workers[0]
        setAgentState(writer.id, 'running')
        bus.emit({ type: 'agent-start', agent: writer.id })
        bus.emit({ type: 'dispatch', from: orchestrator.id, to: writer.id, tag: 'GENERATE' })
        emitTokens(writer.id, t(500))
      }, t(300))
    )
    timers.push(
      setTimeout(() => {
        if (!active) return
        const writer = workers.find((d) => d.role === 'writer') ?? workers[0]
        const critic = workers.find((d) => d.role === 'critic') ?? workers[workers.length - 1]
        setAgentState(writer.id, 'done')
        bus.emit({ type: 'agent-done', agent: writer.id })
        setAgentState(critic.id, 'running')
        bus.emit({ type: 'agent-start', agent: critic.id })
        bus.emit({ type: 'dispatch', from: orchestrator.id, to: critic.id, tag: 'VERIFY' })
        emitTokens(critic.id, t(400))
      }, t(900))
    )
    timers.push(
      setTimeout(() => {
        if (!active) return
        const critic = workers.find((d) => d.role === 'critic') ?? workers[workers.length - 1]
        setAgentState(critic.id, 'done')
        bus.emit({ type: 'agent-done', agent: critic.id })
        const verdict = 'pass'
        emitPolicyApplied(critic.id, 'escalate', `adversarial-${verdict}`)
        const cost = simulateCost(critic.id, orchestrator.model)
        bus.emit({ type: 'cost-updated', nodeId: critic.id, missionCostUsd: cost.missionCostUsd, nodeCostUsd: cost.nodeCostUsd })
        const final = `# Mission Complete\n\nObjective: ${objective}\n\nAdversarial review complete.\n\n## Verdict\n\n${verdict.toUpperCase()}\n\n## Notes\n\nTight generator/verifier cycle completed in SIM.`
        bus.emit({ type: 'artifact-stored', id: 'sim-artifact-1', agent: critic.id, kind: 'final', summary: 'Adversarial review artifact' })
        bus.emit({ type: 'approval-requested', missionId: 'sim', artifactId: 'sim-artifact-1', summary: 'Adversarial review artifact' })
        bus.emit({ type: 'approval-resolved', decision: 'approved' })
        bus.emit({ type: 'mission-complete', final, artifactId: 'sim-artifact-1', verified: true })
        active = false
      }, t(1500))
    )
    return
  }

  if (shape === 'deep-research') {
    timers.push(
      setTimeout(() => {
        if (!active) return
        bus.emit({ type: 'plan-step', n: 1, total: 2, thought: 'Deep research: spawn up to 5 researchers.' })
        const scoutIds = workers.slice(0, 5).map((d) => d.id)
        for (const id of scoutIds) {
          setAgentState(id, 'running')
          bus.emit({ type: 'agent-start', agent: id })
          bus.emit({ type: 'dispatch', from: orchestrator.id, to: id, tag: 'RESEARCH' })
        }
        emitTokens(scoutIds[0], t(400))
        emitTokens(scoutIds[1], t(600))
      }, t(400))
    )
    timers.push(
      setTimeout(() => {
        if (!active) return
        bus.emit({ type: 'plan-step', n: 2, total: 2, thought: 'Converge findings.' })
        const analyzer = workers[2]
        setAgentState(analyzer.id, 'running')
        bus.emit({ type: 'agent-start', agent: analyzer.id })
        bus.emit({ type: 'dispatch', from: orchestrator.id, to: analyzer.id, tag: 'CONVERGE' })
        emitTokens(analyzer.id, t(700))
        bus.emit({ type: 'convergence', reason: 'dry-rounds', rounds: 2 })
      }, t(1600))
    )
    timers.push(
      setTimeout(() => {
        if (!active) return
        const analyzer = workers[2]
        setAgentState(analyzer.id, 'done')
        bus.emit({ type: 'agent-done', agent: analyzer.id })
        const final = `# Mission Complete\n\nObjective: ${objective}\n\nDeep research SIM complete.\n\n## Findings\n\n- 5 parallel researchers simulated.\n- Convergence reached after 2 dry rounds.\n- Strict gate enforced.`
        bus.emit({ type: 'artifact-stored', id: 'sim-artifact-1', agent: analyzer.id, kind: 'final', summary: 'Deep research final artifact' })
        runFinalGate({ id: 'sim-artifact-1', nodeId: analyzer.id, kind: 'final', summary: 'Deep research final artifact', content: final }).then((gate) => {
          bus.emit({ type: 'approval-requested', missionId: 'sim', artifactId: 'sim-artifact-1', summary: 'Deep research final artifact' })
          bus.emit({ type: 'approval-resolved', decision: 'approved' })
          bus.emit({ type: 'mission-complete', final, artifactId: 'sim-artifact-1', verified: gate.verdict === 'pass' })
        })
        const cost = simulateCost(analyzer.id, orchestrator.model)
        bus.emit({ type: 'cost-updated', nodeId: analyzer.id, missionCostUsd: cost.missionCostUsd, nodeCostUsd: cost.nodeCostUsd })
        emitPolicyApplied('RESEARCHER', 'skip', 'simulated policy skip')
        active = false
      }, t(2800))
    )
    return
  }

  if (shape === 'broad-sweep') {
    timers.push(
      setTimeout(() => {
        if (!active) return
        bus.emit({ type: 'plan-step', n: 1, total: 3, thought: 'Broad sweep discovery loop.' })
        const scoutIds = workers.slice(0, 4).map((d) => d.id)
        for (const id of scoutIds) {
          setAgentState(id, 'running')
          bus.emit({ type: 'agent-start', agent: id })
          bus.emit({ type: 'dispatch', from: orchestrator.id, to: id, tag: 'SCOUT' })
        }
        emitTokens(scoutIds[0], t(400))
        emitTokens(scoutIds[1], t(600))
      }, t(400))
    )
    timers.push(
      setTimeout(() => {
        if (!active) return
        bus.emit({ type: 'plan-step', n: 2, total: 3, thought: 'Converge after discovery.' })
        const analyzer = workers[2]
        setAgentState(analyzer.id, 'running')
        bus.emit({ type: 'agent-start', agent: analyzer.id })
        bus.emit({ type: 'dispatch', from: orchestrator.id, to: analyzer.id, tag: 'CONVERGE' })
        emitTokens(analyzer.id, t(700))
        bus.emit({ type: 'convergence', reason: 'dry-rounds', rounds: 2 })
      }, t(1600))
    )
    timers.push(
      setTimeout(() => {
        if (!active) return
        const analyzer = workers[2]
        setAgentState(analyzer.id, 'done')
        bus.emit({ type: 'agent-done', agent: analyzer.id })
        const final = `# Mission Complete\n\nObjective: ${objective}\n\nBroad sweep SIM complete.\n\n## Findings\n\n- Discovery loop ran until 2 consecutive dry rounds.\n- Coverage summary generated.`
        bus.emit({ type: 'artifact-stored', id: 'sim-artifact-1', agent: analyzer.id, kind: 'final', summary: 'Broad sweep final artifact' })
        runFinalGate({ id: 'sim-artifact-1', nodeId: analyzer.id, kind: 'final', summary: 'Broad sweep final artifact', content: final }).then((gate) => {
          bus.emit({ type: 'approval-requested', missionId: 'sim', artifactId: 'sim-artifact-1', summary: 'Broad sweep final artifact' })
          bus.emit({ type: 'approval-resolved', decision: 'approved' })
          bus.emit({ type: 'mission-complete', final, artifactId: 'sim-artifact-1', verified: gate.verdict === 'pass' })
        })
        const cost = simulateCost(analyzer.id, orchestrator.model)
        bus.emit({ type: 'cost-updated', nodeId: analyzer.id, missionCostUsd: cost.missionCostUsd, nodeCostUsd: cost.nodeCostUsd })
        emitPolicyApplied('RESEARCHER', 'skip', 'simulated policy skip')
        active = false
      }, t(2800))
    )
    return
  }

  timers.push(
    setTimeout(() => {
      if (!active) return
      bus.emit({ type: 'plan-step', n: 1, total: 3, thought: 'Analyze objective and spawn scouts.' })
      const scoutIds = workers.slice(0, 2).map((d) => d.id)
      for (const id of scoutIds) {
        setAgentState(id, 'running')
        bus.emit({ type: 'agent-start', agent: id })
        bus.emit({ type: 'dispatch', from: orchestrator.id, to: id, tag: 'SCOUT' })
      }
      emitTokens(scoutIds[0], t(400))
      emitTokens(scoutIds[1], t(600))
    }, t(400))
  )

  timers.push(
    setTimeout(() => {
      if (!active) return
      bus.emit({ type: 'plan-step', n: 2, total: 3, thought: 'Converge findings from scouts.' })
      const analyzer = workers[2]
      setAgentState(analyzer.id, 'running')
      bus.emit({ type: 'agent-start', agent: analyzer.id })
      bus.emit({ type: 'dispatch', from: orchestrator.id, to: analyzer.id, tag: 'CONVERGE' })
      emitTokens(analyzer.id, t(700))
    }, t(1200))
  )

  timers.push(
    setTimeout(() => {
      if (!active) return
      bus.emit({ type: 'plan-step', n: 3, total: 3, thought: 'Compose final artifact.' })
      const writer = workers[3]
      setAgentState(writer.id, 'running')
      bus.emit({ type: 'agent-start', agent: writer.id })
      bus.emit({ type: 'dispatch', from: orchestrator.id, to: writer.id, tag: 'ARTIFACT' })
      emitTokens(writer.id, t(800))
    }, t(2200))
  )

  timers.push(
    setTimeout(() => {
      if (!active) return
      const writer = workers[3]
      for (const w of workers) setAgentState(w.id, 'done')
      const final = `# Mission Complete\n\nObjective: ${objective}\n\nSimulated artifact generated by AXIOM.\n\n## Summary\n\nAll dispatched agents converged and produced the requested artifact.\n\n## Key Points\n\n- Agents executed in parallel as planned.\n- Tokens streamed to the event feed in real time.\n- Mission persisted to local history.`
      bus.emit({ type: 'artifact-stored', id: 'sim-artifact-1', agent: writer.id, kind: 'final', summary: 'Simulated final artifact' })
      runFinalGate({ id: 'sim-artifact-1', nodeId: writer.id, kind: 'final', summary: 'Simulated final artifact', content: final }).then((gate) => {
        bus.emit({ type: 'approval-requested', missionId: 'sim', artifactId: 'sim-artifact-1', summary: 'Simulated final artifact' })
        bus.emit({ type: 'approval-resolved', decision: 'approved' })
        bus.emit({ type: 'mission-complete', final, artifactId: 'sim-artifact-1', verified: gate.verdict === 'pass' })
      })
      const cost = simulateCost(writer.id, orchestrator.model)
      bus.emit({ type: 'cost-updated', nodeId: writer.id, missionCostUsd: cost.missionCostUsd, nodeCostUsd: cost.nodeCostUsd })
      emitPolicyApplied('RESEARCHER', 'skip', 'simulated policy skip')
      bus.emit({ type: 'convergence', reason: 'dry-rounds', rounds: 2 })
      active = false
    }, t(3200))
  )
}

function emitTokens(agent: string, duration: number) {
  const parts = ['Analyzing ', 'data ', 'streams ', '... ', 'converging ', 'results ', 'done.']
  const step = duration / parts.length
  for (let i = 0; i < parts.length; i++) {
    const tid = setTimeout(() => {
      if (!active) return
      bus.emit({ type: 'token', agent, text: parts[i] })
    }, step * i)
    timers.push(tid)
  }
  const done = setTimeout(() => {
    if (!active) return
    setAgentState(agent, 'done')
    bus.emit({ type: 'agent-done', agent })
  }, duration)
  timers.push(done)
}

export function reset() {
  active = false
  for (const t of timers) clearTimeout(t)
  timers = []
  abortAll()
  initDefs()
}
