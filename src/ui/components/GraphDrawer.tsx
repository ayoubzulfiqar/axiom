import { useBus } from '../stores/bus'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'
import { getMissionCost } from '../../engine/cost'
import { useMissionStore } from '../../stores/mission'
import bus from '../../engine/bus'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { listContainer, listItem, springSnappy } from '../fx'

export function GraphDrawer() {
  const open = useBus((s) => s.graphOpen)
  const setOpen = useBus((s) => s.setGraphOpen)
  const decisions = useMissionStore((s) => s.decisions)
  const [costByNode, setCostByNode] = useState<Array<{ nodeId: string; costUsd: number }>>([])

  useEffect(() => {
    const unsub = bus.on((ev) => {
      if (ev.type === 'cost-updated' || ev.type === 'mission-start') {
        const cost = getMissionCost()
        const entries = Object.entries(cost.byNode)
          .map(([nodeId, value]) => ({ nodeId, costUsd: value.costUsd }))
          .sort((a, b) => b.costUsd - a.costUsd)
        setCostByNode(entries)
      }
    })
    return () => {
      unsub()
    }
  }, [])

  const maxCost = costByNode[0]?.costUsd ?? 0

  return (
    <>
      <div className="hidden md:block">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={springSnappy}
              className="fixed right-0 top-14 z-40 h-[calc(100%-3.5rem)] w-[360px] border-l border-border bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <SheetTitle className="text-foreground">Routing Decisions</SheetTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] uppercase tracking-wider text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
              </div>
              <DrawerBody decisions={decisions} costByNode={costByNode} maxCost={maxCost} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button variant="outline" size="sm" className="border-border" data-testid="graph-drawer-trigger">
              Graph
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[360px] border-border p-0" data-testid="graph-drawer">
            <SheetHeader>
              <SheetTitle className="text-foreground">Routing Decisions</SheetTitle>
            </SheetHeader>
            <DrawerBody decisions={decisions} costByNode={costByNode} maxCost={maxCost} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

function DrawerBody({
  decisions,
  costByNode,
  maxCost,
}: {
  decisions: Array<{ step: number; thought: string; routes: string[] }>
  costByNode: Array<{ nodeId: string; costUsd: number }>
  maxCost: number
}) {
  return (
    <motion.div variants={listContainer} initial="hidden" animate="show" className="h-[calc(100%-48px)] space-y-5 overflow-y-auto p-4">
      <section>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Decision Timeline
        </div>
        {decisions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
            No decisions yet. Run a mission to trace the routing graph.
          </div>
        ) : (
          <ol className="space-y-2">
            {decisions.map((d) => (
              <motion.li
                key={d.step}
                variants={listItem}
                className="relative overflow-hidden rounded-md border border-border bg-background/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-border font-mono text-[10px] text-muted-foreground">
                    {d.step}
                  </span>
                  <span className="text-[11px] text-foreground/90">{d.thought}</span>
                </div>
                {d.routes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                    {d.routes.map((r, i) => (
                      <span
                        key={`${r}-${i}`}
                        className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] text-info"
                      >
                        → {r}
                      </span>
                    ))}
                  </div>
                )}
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Cost by Agent
        </div>
        {costByNode.length === 0 ? (
          <div className="text-[11px] text-muted-foreground">No cost data yet.</div>
        ) : (
          <div className="space-y-2">
            {costByNode.map((item) => {
              const width = maxCost > 0 ? Math.max(4, (item.costUsd / maxCost) * 100) : 0
              return (
                <div key={item.nodeId} className="space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="truncate text-foreground/80">{item.nodeId}</span>
                    <span className="shrink-0 text-muted-foreground">${item.costUsd.toFixed(4)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-foreground/70"
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </motion.div>
  )
}
