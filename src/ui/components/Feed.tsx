import { useRef, useEffect } from 'react'
import { useFeedStore } from '../../stores/feed'

export function Feed() {
  const entries = useFeedStore((s) => s.entries)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  const fmtTime = (t: number) => {
    const d = new Date(t)
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0').slice(0, 2)
    return `${m}:${s}.${ms}`
  }

  const tagColor: Record<string, string> = {
    SYS: 'text-faint',
    PLAN: 'text-dim',
    DISP: 'text-dim',
    RUN: 'text-ink',
    DONE: 'text-faint',
    FAULT: 'text-red-400',
    TOKEN: 'text-dim',
  }

  return (
    <div className="hidden lg:block w-[308px] border-l border-line bg-panel/40 flex flex-col">
      <div className="px-3 py-3 border-b border-line text-xs font-bold tracking-widest text-dim">EVENT STREAM</div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-5">
        {entries.map((e) => (
          <div key={e.id} className="flex gap-2 py-0.5">
            <span className="text-faint shrink-0">{fmtTime(e.time)}</span>
            <span className={`${tagColor[e.tag] ?? 'text-dim'} w-10 shrink-0`}>{e.tag}</span>
            <span className={`truncate ${e.sys ? 'text-dim italic' : 'text-ink'}`}>{e.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
