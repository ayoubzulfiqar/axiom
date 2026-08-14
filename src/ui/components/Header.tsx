import { useBus } from '../stores/bus'
import { Button } from '../components/ui/button'
import { useState } from 'react'

export function Header() {
  const setRosterOpen = useBus((s: { setRosterOpen: (v: boolean) => void }) => s.setRosterOpen)
  const setVaultOpen = useBus((s: { setVaultOpen: (v: boolean) => void }) => s.setVaultOpen)
  const [sim, setSim] = useState(false)

  return (
    <header className="h-12 border-b border-line bg-panel/40 flex items-center px-4 justify-between">
      <div className="flex items-center gap-3">
        <div className="text-xs font-bold tracking-widest">AXIOM</div>
        <div className="text-[10px] text-dim font-mono">AGENTIC ORCHESTRATION CONSOLE</div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-[10px] text-dim">
          <input type="checkbox" data-testid="sim-toggle" checked={sim} onChange={(e) => setSim(e.target.checked)} />
          SIM MODE
        </label>
        <Button data-testid="run-button" variant="outline" size="sm" className="border-line text-ink" onClick={() => useBus.getState().setObjectiveOpen(true)}>RUN</Button>
        <Button variant="ghost" size="sm" className="text-dim" onClick={() => setRosterOpen(true)}>ROSTER</Button>
        <Button variant="ghost" size="sm" className="text-dim" onClick={() => setVaultOpen(true)}>VAULT</Button>
      </div>
    </header>
  )
}
