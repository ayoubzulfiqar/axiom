import { useBus } from '../stores/bus'
import { useVaultStore } from '../../stores/vault'
import { useMissionStore } from '../../stores/mission'
import { clearFeed } from '../../stores/feed'
import { runSimulation, GRAPH_SHAPES, type GraphShape } from '../../engine/simulator'
import { runMission } from '../../engine/client'
import bus from '../../engine/bus'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'motion/react'
import { springSnappy } from '../fx'

export function ObjectivePrompt() {
  const open = useBus((s) => s.objectiveOpen)
  const setOpen = useBus((s) => s.setObjectiveOpen)
  const [text, setText] = useState('')
  const [shape, setShape] = useState<GraphShape>('standard')
  const connected = useVaultStore((s) => s.connected)
  const status = useMissionStore((s) => s.status)

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
      // SIM mode (toggle in Header) exercises the full event pipeline offline.
      // Otherwise dispatch a real mission against OpenRouter using the connected key.
      if (useBus.getState().simMode) {
        runSimulation(text.trim(), shape)
      } else {
        const missionId = `m_${Date.now()}`
        await runMission({ id: missionId, objective: text.trim(), shape })
      }
    } catch (e) {
      console.error('RUN ERROR', e)
      bus.emit({ type: 'fault', agent: 'orchestrator', error: e instanceof Error ? e.message : 'UNKNOWN' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg overflow-hidden p-0" data-testid="objective-dialog">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={springSnappy}
          className="p-6"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
          <DialogClose aria-label="Close" className="absolute right-4 top-4">
            <span className="text-muted-foreground transition-colors hover:text-foreground">✕</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              Mission Objective
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid="objective-input"
                placeholder="Describe the mission for the agent mesh…"
                className="border-border focus-visible:border-foreground/50"
                onKeyDown={(e) => e.key === 'Enter' && handleRun()}
                autoFocus
              />
            </motion.div>

            <div>
              <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Graph Shape
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.values(GRAPH_SHAPES).map((s) => (
                  <motion.button
                    key={s.id}
                    onClick={() => setShape(s.id)}
                    data-testid={`shape-${s.id}`}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      shape === s.id
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
                    }`}
                  >
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                data-testid="objective-submit"
                onClick={handleRun}
                disabled={!text.trim() || status === 'running'}
                className="min-w-[110px]"
              >
                {status === 'running' ? <Loader2 className="animate-spin" size={14} /> : 'Execute'}
              </Button>
            </motion.div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
