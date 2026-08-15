import { useBus } from '../stores/bus'
import { useVaultStore } from '../../stores/vault'
import { useMissionStore } from '../../stores/mission'
import { clearFeed } from '../../stores/feed'
import { runSimulation, GRAPH_SHAPES, type GraphShape } from '../../engine/simulator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

export function ObjectivePrompt() {
  const open = useBus((s: { objectiveOpen: boolean }) => s.objectiveOpen)
  const setOpen = useBus((s: { setObjectiveOpen: (v: boolean) => void }) => s.setObjectiveOpen)
  const [text, setText] = useState('')
  const [shape, setShape] = useState<GraphShape>('standard')
  const connected = useVaultStore((s: { connected: boolean }) => s.connected)
  const status = useMissionStore((s: { status: string }) => s.status)

  const handleRun = async () => {
    const title = document.querySelector('title')
    if (title) title.textContent = 'AXIOM RUNNING'
    if (!text.trim()) return
    if (!connected) {
      useVaultStore.getState().setVaultOpen(true)
      return
    }
    useBus.setState({ objectiveOpen: false })
    useMissionStore.setState({ status: 'running', objective: text, startedAt: Date.now() })
    clearFeed()
    try {
      runSimulation(text.trim(), shape)
    } catch (e) {
      console.error('SIM ERROR', e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-panel border-line text-ink max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest">MISSION OBJECTIVE</DialogTitle>
        </DialogHeader>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          data-testid="objective-input"
          placeholder="Enter mission objective..."
          className="bg-transparent border-line text-ink"
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
        />
        <div className="flex items-center gap-2">
          {Object.values(GRAPH_SHAPES).map((s) => (
            <button
              key={s.id}
              onClick={() => setShape(s.id)}
              className={`text-[10px] px-2 py-1 rounded border transition ${shape === s.id ? 'border-ink bg-panel' : 'border-line hover:border-faint'}`}
              data-testid={`shape-${s.id}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button data-testid="objective-submit" onClick={handleRun} disabled={!text.trim() || status === 'running'} className="bg-ink text-bg hover:bg-ink/90">
            {status === 'running' ? <Loader2 className="animate-spin" size={14} /> : 'EXECUTE'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
