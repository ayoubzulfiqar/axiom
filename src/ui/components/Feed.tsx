import { useRef, useEffect } from 'react'
import { useFeedStore } from '../../stores/feed'

const GATE_TAG = 'GATE'
const POLICY_TAG = 'POLICY'
const CONVERGENCE_TAG = 'CONV'
const APPROVAL_TAG = 'APPROVAL'

export function Feed() {
  const entries = useFeedStore((s) => s.entries)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  const tagClass = (tag: string) => {
    if (tag === GATE_TAG) return 'text-ink'
    if (tag === POLICY_TAG) return 'text-ink/80'
    if (tag === CONVERGENCE_TAG) return 'text-ink'
    if (tag === APPROVAL_TAG) return 'text-ink'
    return 'text-ink'
  }

  return (
    <div className="h-24 border-b border-line bg-panel/30 overflow-hidden">
      <div className="px-3 py-1 border-b border-line text-[10px] font-bold tracking-widest text-dim">EVENT FEED</div>
      <div className="h-[calc(100%-22px)] overflow-y-auto p-2 space-y-1">
        {entries.map((entry) => (
          <div key={entry.id} data-testid="feed-entry" className="text-[10px] font-mono text-ink/80 truncate">
            <span className="text-dim mr-1">[{new Date(entry.time).toLocaleTimeString()}]</span>
            <span className={tagClass(entry.tag)}>{entry.tag}</span>
            <span className="text-dim mx-1">›</span>
            <span className="text-ink/70">{entry.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
