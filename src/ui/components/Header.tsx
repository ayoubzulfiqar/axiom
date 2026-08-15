import { useBus } from '../stores/bus'
import { Button } from '../components/ui/button'
import { useMissionStore } from '../../stores/mission'
import { useSettingsStore } from '../../stores/settings'
import bus from '../../engine/bus'
import { loadCheckpoint } from '../../engine/checkpoints'
import { useEffect, useState } from 'react'

export function Header() {
  const setRosterOpen = useBus((s: { setRosterOpen: (v: boolean) => void }) => s.setRosterOpen)
  const setVaultOpen = useBus((s: { setVaultOpen: (v: boolean) => void }) => s.setVaultOpen)
  const setObjectiveOpen = useBus((s: { setObjectiveOpen: (v: boolean) => void }) => s.setObjectiveOpen)
  const simMode = useBus((s: { simMode: boolean }) => s.simMode)
  const toggleSim = () => {
    const next = !simMode
    useBus.getState().setSimMode(next)
    if (next) useBus.getState().setObjectiveOpen(true)
  }
  const status = useMissionStore((s: { status: string }) => s.status)
  const approvalRequired = useSettingsStore((s: { approvalRequired: boolean }) => s.approvalRequired)
  const toggleApproval = () => useSettingsStore.getState().setApprovalRequired(!approvalRequired)
  const [gating, setGating] = useState(false)
  const resume = () => {
    const cp = loadCheckpoint('current')
    if (cp) {
      bus.emit({ type: 'mission-start', objective: cp.missionId })
      useMissionStore.setState({ status: 'running', objective: cp.missionId, step: cp.currentStep, total: cp.currentStep + 1 })
    }
  }

  useEffect(() => {
    const unsub = bus.on((ev) => {
      if (ev.type === 'gate-start') setGating(true)
      if (ev.type === 'gate-pass' || ev.type === 'gate-fail') setGating(false)
    })
    return () => { unsub() }
  }, [])

  return (
    <header className={`h-12 border-b border-line bg-panel/40 flex items-center px-4 justify-between ${gating ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="text-xs font-bold tracking-widest">AXIOM</div>
        <div className="text-[10px] text-dim font-mono">AGENTIC ORCHESTRATION CONSOLE</div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-[10px] text-dim">
          <input type="checkbox" data-testid="sim-toggle" checked={simMode} onChange={toggleSim} />
          SIM MODE
        </label>
        <label className="flex items-center gap-2 text-[10px] text-dim">
          <input type="checkbox" data-testid="approval-toggle" checked={approvalRequired} onChange={toggleApproval} />
          APPROVAL
        </label>
        {status === 'paused' && <Button data-testid="resume-button" variant="outline" size="sm" className="border-line text-ink" onClick={resume}>RESUME</Button>}
        <Button data-testid="run-button" variant="outline" size="sm" className="border-line text-ink" onClick={() => setObjectiveOpen(true)}>RUN</Button>
        {status === 'running' || status === 'complete' ? (
          <span className="text-[10px] font-mono text-dim" data-testid="telemetry-chip">
            ⚡ {(() => { const t = useMissionStore.getState().telemetry; const actual = t.actualSpeedup != null ? t.actualSpeedup.toFixed(1) : '-'; const theoretical = t.theoreticalSpeedup != null ? t.theoreticalSpeedup.toFixed(1) : '-'; return `${actual}x / ${theoretical}x max`; })()}
          </span>
        ) : null}
        <Button variant="ghost" size="sm" className="text-dim" onClick={() => setRosterOpen(true)}>ROSTER</Button>
        <Button variant="ghost" size="sm" className="text-dim" onClick={() => setVaultOpen(true)}>VAULT</Button>
      </div>
    </header>
  )
}
