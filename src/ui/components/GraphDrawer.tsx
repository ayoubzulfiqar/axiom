import { useBus } from '../stores/bus'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'

export function GraphDrawer() {
  const open = useBus((s: { graphOpen: boolean }) => s.graphOpen)
  const setOpen = useBus((s: { setGraphOpen: (v: boolean) => void }) => s.setGraphOpen)

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
        </div>
      </SheetContent>
    </Sheet>
  )
}
