import { useBus } from '../stores/bus'
import { useMeshStore } from '../../stores/mesh'
import { useVaultStore } from '../../stores/vault'
import { Button } from '../components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet'
import { useEffect, useState } from 'react'
import bus from '../../engine/bus'
import { motion } from 'motion/react'
import { listContainer, listItem, springSnappy } from '../fx'

type AgentRec = { id: string; label: string; state: string; role: string; model: string }

function StatusDot({ state }: { state: string }) {
  const tone =
    state === 'running'
      ? 'bg-info'
      : state === 'done'
        ? 'bg-success'
        : state === 'fault'
          ? 'bg-destructive'
          : 'bg-muted-foreground'
  const active = state === 'running'
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {active && (
        <motion.span
          className="absolute inline-flex h-full w-full rounded-full bg-info"
          animate={{ scale: [1, 2.4], opacity: [0.7, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <motion.span className={`relative inline-flex h-2 w-2 rounded-full ${tone}`} layout />
    </span>
  )
}

function RosterBody({ onPick }: { onPick?: (id: string) => void }) {
  const roster = useMeshStore((s) => s.roster)
  const selectedId = useMeshStore((s) => s.selectedId)
  const balance = useVaultStore((s) => s.balance)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const unsub = bus.on((ev: any) => {
      if (ev.type === 'policy-applied') {
        setFlash(ev.agent)
        setTimeout(() => setFlash(null), 800)
      }
    })
    return () => {
      unsub()
    }
  }, [])

  const agents = Object.values(roster) as AgentRec[]

  return (
    <div className="flex h-full w-[252px] flex-col border-r border-border bg-card/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Agent Mesh
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">{agents.length}</div>
      </div>
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="flex-1 space-y-1 overflow-y-auto p-2"
      >
        {agents.map((a) => {
          const selected = a.id === selectedId
          return (
            <motion.button
              key={a.id}
              variants={listItem}
              onClick={() => onPick?.(a.id)}
              data-testid="roster-row"
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              className={`relative w-full overflow-hidden rounded-md border px-2.5 py-2 text-left transition-colors ${
                selected ? 'border-foreground/40 bg-accent' : 'border-transparent hover:border-border hover:bg-accent/50'
              } ${flash === a.id ? 'bg-info/15' : ''}`}
            >
              {selected && (
                <motion.span
                  layoutId="roster-active"
                  className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-foreground"
                  transition={springSnappy}
                />
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <StatusDot state={a.state} />
                  <span className="truncate font-mono text-xs text-foreground">{a.label}</span>
                </div>
                <span className="shrink-0 font-mono text-[9px] uppercase text-muted-foreground">
                  {a.state}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 pl-4">
                <span className="truncate text-[10px] text-muted-foreground">{a.role}</span>
                <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                  {a.model.split('/')[1]?.slice(0, 10)}
                </span>
              </div>
            </motion.button>
          )
        })}
        {agents.length === 0 && (
          <div className="px-2 py-6 text-center text-[11px] text-muted-foreground">
            No agents in mesh. Run a mission.
          </div>
        )}
      </motion.div>
      {balance && (
        <div className="border-t border-border px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider">Balance</span>
            <span className="text-foreground">{balance.label ?? 'CREDITS'}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span>{balance.usage?.toFixed(4)}</span>
            <span className="text-muted-foreground">/ {balance.limit?.toFixed(2)}</span>
          </div>
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-foreground/70"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (balance.usage / Math.max(balance.limit, 0.0001)) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function Roster() {
  const open = useBus((s) => s.rosterOpen)
  const setOpen = useBus((s) => s.setRosterOpen)
  const setDetailOpen = useBus((s) => s.setDetailOpen)

  const handlePick = (id: string) => {
    useMeshStore.setState({ selectedId: id })
    setDetailOpen(true)
    setOpen(false)
  }

  return (
    <>
      <div className="hidden md:block">
        <RosterBody />
      </div>
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger>
            <Button variant="outline" size="sm" className="border-border md:hidden" data-testid="roster-trigger">
              Mesh
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[252px] border-border p-0" data-testid="roster-sheet">
            <SheetHeader className="sr-only">
              <SheetTitle>Agent Mesh</SheetTitle>
            </SheetHeader>
            <RosterBody onPick={handlePick} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
