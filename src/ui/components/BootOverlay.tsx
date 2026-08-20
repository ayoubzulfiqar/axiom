import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useBus } from '../stores/bus'
import { springSoft } from '../fx'

const STEPS = [
  'INITIALIZING ORCHESTRATION CORE',
  'LOADING AGENT MESH',
  'COMPILING ROUTING GRAPH',
  'ESTABLISHING SECURE VAULT CHANNEL',
  'AXIOM READY',
]

export function BootOverlay() {
  const setBooted = useBus((s) => s.setBooted)
  const done = useRef(false)
  const finish = () => {
    if (done.current) return
    done.current = true
    setBooted(true)
  }

  useEffect(() => {
    const timeout = setTimeout(finish, 2800)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-background"
        exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ambient glow */}
        <motion.div
          className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgb(80 140 255 / 0.18), transparent 60%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative w-80">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={springSoft}
            className="mb-8 flex items-center gap-3"
          >
            <motion.div
              className="relative grid h-11 w-11 place-items-center rounded-xl border border-border bg-card"
              animate={{ boxShadow: ['0 0 0px rgb(80 140 255 / 0)', '0 0 28px rgb(80 140 255 / 0.45)', '0 0 0px rgb(80 140 255 / 0)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <motion.span
                className="block h-4 w-4 rotate-45 border border-foreground/70"
                animate={{ rotate: [45, 225, 45] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="absolute h-1.5 w-1.5 rounded-full bg-foreground" />
            </motion.div>
            <div className="leading-none">
              <motion.div
                className="text-lg font-semibold tracking-[0.35em] text-foreground"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                AXIOM
              </motion.div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                Agent Orchestration
              </div>
            </div>
          </motion.div>

          <div className="space-y-2.5">
            {STEPS.map((text, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.16, ...springSoft }}
                className="flex items-center gap-2.5 font-mono text-[11px] text-muted-foreground"
              >
                <span className="text-foreground/40">{String(i + 1).padStart(2, '0')}</span>
                <motion.span
                  className="h-px w-4 bg-border"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.3 + i * 0.16, duration: 0.3 }}
                />
                {text}
                {i === STEPS.length - 1 && (
                  <motion.span
                    className="ml-1 h-1.5 w-1.5 rounded-full bg-success"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ delay: 0.25 + i * 0.16 + 0.2, duration: 0.4 }}
                  />
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-7 h-0.5 w-full overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-info via-foreground to-info"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={finish}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
