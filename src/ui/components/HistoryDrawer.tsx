import { useBus } from '../stores/bus'
import { useMissionLog } from '../../stores/missionlog'
import { motion, AnimatePresence } from 'motion/react'
import { listContainer, listItem, springSnappy } from '../fx'

const STATUS_TONE: Record<string, string> = {
  running: 'text-info',
  complete: 'text-success',
  fault: 'text-destructive',
}

export function HistoryDrawer() {
  const open = useBus((s) => s.historyOpen)
  const setOpen = useBus((s) => s.setHistoryOpen)
  const entries = useMissionLog((s) => s.entries)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="history-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={springSnappy}
            className="absolute left-0 top-0 flex h-full w-[360px] flex-col border-r border-border bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Mission Log
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="flex-1 overflow-y-auto p-3"
            >
              {entries.length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-[11px] text-muted-foreground">
                  No missions yet. Run a mission to populate history.
                </div>
              ) : (
                <ul className="space-y-2">
                  {entries.map((e) => (
                    <motion.li
                      key={e.id}
                      variants={listItem}
                      className="rounded-md border border-border bg-background/40 p-3 transition-colors hover:border-foreground/30"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-mono text-[10px] uppercase ${STATUS_TONE[e.status] ?? 'text-muted-foreground'}`}
                        >
                          {e.status}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {new Date(e.startedAt).toLocaleTimeString([], { hour12: false })}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs text-foreground">{e.objective}</div>
                      <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                        <span>{e.decisions} steps</span>
                        {e.verified === true && <span className="text-success">verified</span>}
                        {e.verified === false && <span className="text-destructive">unverified</span>}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
