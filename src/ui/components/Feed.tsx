import { useRef, useEffect } from 'react'
import { useFeedStore } from '../../stores/feed'
import { motion, AnimatePresence } from 'motion/react'
import { springSoft } from '../fx'

const TAG_STYLE: Record<string, string> = {
  SYS: 'text-foreground bg-foreground/10',
  PLAN: 'text-info bg-info/10',
  DISP: 'text-chart-2 bg-chart-2/10',
  RUN: 'text-warning bg-warning/10',
  DONE: 'text-success bg-success/10',
  FAULT: 'text-destructive bg-destructive/10',
  ARTIFACT: 'text-chart-1 bg-chart-1/10',
  GATE: 'text-info bg-info/10',
  PASS: 'text-success bg-success/10',
  FAIL: 'text-destructive bg-destructive/10',
  POLICY: 'text-chart-5 bg-chart-5/10',
  CONV: 'text-muted-foreground bg-muted',
  APPR: 'text-warning bg-warning/10',
  CHK: 'text-muted-foreground bg-muted',
}

export function Feed() {
  const entries = useFeedStore((s) => s.entries)
  const tokenRate = useFeedStore((s) => s.tokenRate)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="relative flex h-28 shrink-0 flex-col border-b border-border bg-card/30 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Event Feed
        </span>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {tokenRate > 0 && (
              <motion.span
                key="stream"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 font-mono text-[10px] text-info"
              >
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-info"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
                {tokenRate} tok/s
              </motion.span>
            )}
          </AnimatePresence>
          <span className="font-mono text-[10px] text-muted-foreground">{entries.length}</span>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        {entries.length === 0 && (
          <div className="py-4 text-center text-[11px] text-muted-foreground">
            Awaiting mission activity…
          </div>
        )}
        <AnimatePresence initial={false}>
          {entries.slice(-40).map((entry) => (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={springSoft}
              data-testid="feed-entry"
              className="flex items-baseline gap-2"
            >
              <span className="shrink-0 text-muted-foreground/60">
                {new Date(entry.time).toLocaleTimeString([], { hour12: false })}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-px text-[9px] font-semibold tracking-wider ${
                  TAG_STYLE[entry.tag] ?? 'text-foreground bg-foreground/10'
                }`}
              >
                {entry.tag}
              </span>
              <span className="truncate text-foreground/80">{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>
    </div>
  )
}
