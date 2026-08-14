import { useRef, useEffect } from 'react'
import { useFeedStore } from '../../stores/feed'

export function Feed() {
  const entries = useFeedStore((s) => s.entries)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="h-24 border-b border-line bg-panel/30 overflow-hidden">
      <div className="px-3 py-1 border-b border-line text-[10px] font-bold tracking-widest text-dim">EVENT FEED</div>
      <div className="h-[calc(100%-22px)] overflow-y-auto p-2 space-y-1">
        {entries.map((entry) => (
          <div key={entry.id} data-testid="feed-entry" className="text-[10px] font-mono text-ink/80 truncate">
            <span className="text-dim mr-1">[{new Date(entry.time).toLocaleTimeString()}]</span>
            <span className="text-ink">{entry.tag}</span>
            <span className="text-dim mx-1">›</span>
            <span className="text-ink/70">{entry.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
