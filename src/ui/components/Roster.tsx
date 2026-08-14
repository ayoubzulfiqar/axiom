import { useBus } from '../stores/bus'
import { useMeshStore } from '../../stores/mesh'
import { useVaultStore } from '../../stores/vault'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet'

export function Roster() {
  const open = useBus((s: { rosterOpen: boolean }) => s.rosterOpen)
  const setOpen = useBus((s: { setRosterOpen: (v: boolean) => void }) => s.setRosterOpen)
  const roster = useMeshStore((s: { roster: Record<string, { id: string; label: string; state: string; role: string; model: string }> }) => s.roster)
  const selectedId = useMeshStore((s: { selectedId: string | null }) => s.selectedId)
  const balance = useVaultStore((s: { balance: { usage: number; limit: number } | null }) => s.balance)

  const agents = Object.values(roster)

  const content = (
    <div className="h-full w-[236px] border-r border-line bg-panel/40 flex flex-col">
      <div className="px-3 py-3 border-b border-line text-xs font-bold tracking-widest text-dim">AGENT MESH</div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {agents.map((a: { id: string; state: string; label: string; model: string; role: string }) => (
          <button
            key={a.id}
            onClick={() => {}}
            className={`w-full text-left px-2 py-2 rounded border transition ${a.id === selectedId ? 'border-ink bg-panel' : 'border-line hover:border-faint'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${a.state === 'running' ? 'bg-ink animate-pulse' : a.state === 'done' ? 'bg-faint' : a.state === 'fault' ? 'bg-red-500' : 'bg-faint'}`} />
                <span className="font-mono text-xs">{a.label}</span>
              </div>
              <span className="text-[10px] text-dim font-mono">{a.model.split('/')[1]?.slice(0, 8)}</span>
            </div>
            <div className="text-[10px] text-dim mt-0.5">{a.role}</div>
          </button>
        ))}
      </div>
      {balance && (
        <div className="px-3 py-2 border-t border-line text-[10px] font-mono text-dim">
          BALANCE {balance.usage?.toFixed(4)} / {balance.limit?.toFixed(2)}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="hidden md:block">{content}</div>
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="md:hidden border-line text-ink">
              ROSTER
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[236px] border-line bg-panel text-ink p-0">
            {content}
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
