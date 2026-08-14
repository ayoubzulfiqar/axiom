import { useState } from 'react'
import { useBus } from '../stores/bus'
import { db } from '../../lib/db'
import { useQuery } from '@tanstack/react-query'
import { ArtifactModal } from './ArtifactModal'

export function HistoryDrawer() {
  const open = useBus((s: { historyOpen: boolean }) => s.historyOpen)
  const setOpen = useBus((s: { setHistoryOpen: (v: boolean) => void }) => s.setHistoryOpen)
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['missions'],
    queryFn: () => db.missions.orderBy('endedAt').reverse().toArray(),
  })

  const missions = data ?? []

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-16 bottom-0 w-full sm:w-[320px] border-l border-line bg-panel text-ink overflow-y-auto">
        <div className="p-4 border-b border-line text-xs font-bold tracking-widest">MISSION LOG</div>
        <div className="p-4 flex flex-col gap-2">
          {missions.length === 0 && <div className="text-xs text-dim">No missions yet.</div>}
          {missions.map((m: { id?: number; objective: string; endedAt: number; steps: number; tokens: number; artifact: string }) => (
            <button
              key={m.id}
              onClick={() => setSelectedArtifact(m.artifact)}
              className="text-left p-2 border border-line rounded hover:border-ink transition"
            >
              <div className="text-xs font-bold truncate">{m.objective}</div>
              <div className="text-[10px] font-mono text-dim">{new Date(m.endedAt).toLocaleString()}</div>
              <div className="text-[10px] text-dim">steps {m.steps} tokens {m.tokens}</div>
            </button>
          ))}
        </div>
      </div>
      {selectedArtifact && <ArtifactModal artifact={selectedArtifact} />}
    </div>
  )
}
