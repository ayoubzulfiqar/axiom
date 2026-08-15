import { useBus } from '../stores/bus'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'
import { getMissionCost } from '../../engine/cost'
import bus from '../../engine/bus'
import { useEffect, useState } from 'react'

export function GraphDrawer() {
  const open = useBus((s: { graphOpen: boolean }) => s.graphOpen)
  const setOpen = useBus((s: { setGraphOpen: (v: boolean) => void }) => s.setGraphOpen)
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Button variant="outline" size="sm" className="border-line text-ink" data-testid="graph-drawer-trigger">GRAPH</Button>
      </SheetTrigger>
      <SheetContent className="w-[360px] border-line bg-panel text-ink" data-testid="graph-drawer">
        <SheetHeader>
          <SheetTitle className="text-xs font-bold tracking-widest">ROUTING DECISIONS</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 overflow-y-auto h-[calc(100%-48px)]">
          <div className="text-xs text-dim">Decisions timeline will appear here after missions run.</div>
          <div className="mt-4 space-y-2">
            <div className="text-[10px] font-bold tracking-widest text-dim">COST BY AGENT</div>
            {costByNode.length === 0 && <div className="text-[10px] text-dim">No cost data yet.</div>}
            {costByNode.map((item) => {
              const width = maxCost > 0 ? Math.max(4, (item.costUsd / maxCost) * 100) : 0
              return (
                <div key={item.nodeId} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-ink/80">{item.nodeId}</span>
                    <span className="text-dim">${item.costUsd.toFixed(4)}</span>
                  </div>
                  <div className="h-2 w-full bg-line/60 overflow-hidden">
                    <div className="h-full bg-ink/80" style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
