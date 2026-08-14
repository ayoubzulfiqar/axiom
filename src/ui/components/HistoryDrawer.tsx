import { useBus } from '../stores/bus'

export function HistoryDrawer() {
  const open = useBus((s: { historyOpen: boolean }) => s.historyOpen)
  const setOpen = useBus((s: { setHistoryOpen: (v: boolean) => void }) => s.setHistoryOpen)

  return (
    <div data-testid="history-drawer" className={`fixed inset-0 z-40 ${open ? '' : 'hidden'}`}>
      <div className="absolute inset-0 bg-bg/80" onClick={() => setOpen(false)} />
      <div className="absolute left-0 top-0 h-full w-[360px] border-r border-line bg-panel p-4">
        <div className="text-xs font-bold tracking-widest mb-2">MISSION LOG</div>
        <div className="text-[10px] text-dim">No history yet.</div>
      </div>
    </div>
  )
}
