import { useRef, useEffect, useState } from 'react'
import { useBus } from '../stores/bus'
import { useMissionStore } from '../../stores/mission'
import { useMeshStore } from '../../stores/mesh'
import { useSettingsStore } from '../../stores/settings'
import { useFeedStore } from '../../stores/feed'
import { getDefs } from '../../engine/agents'
import { addEdge, createGraph, stepPhysics, tickEdges, computeFit, setNodeState as graphSetState } from '../../engine/graph'
import { setupCanvas, drawGrid, drawDust, drawCoreGlow, drawVignette, applyCamera } from '../../render/scene'
import { drawNodes, drawDoneGlyph } from '../../render/nodes'
import { drawEdges } from '../../render/edges'
import { resolveTheme } from '../../render/palette'
import { setSelected } from '../../render/input'
import bus from '../../engine/bus'
import { motion, AnimatePresence } from 'motion/react'

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef(createGraph([]))
  const lastTimeRef = useRef<number>(0)
  const gateActiveRef = useRef(false)
  const missionActive = useMissionStore((s) => s.status === 'running' || s.status === 'paused')
  const speed = useSettingsStore((s) => s.speed)
  const selectedId = useMeshStore((s) => s.selectedId)
  const graphOpen = useBus((s) => s.graphOpen)
  const status = useMissionStore((s) => s.status)
  const objective = useMissionStore((s) => s.objective)
  const tokenRate = useFeedStore((s) => s.tokenRate)
  const isStandby = status === 'standby'
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    const ids = getDefs().map((d) => d.id)
    graphRef.current = createGraph(ids)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setupCanvas(canvas)
    // The canvas lives in a flex layout that resizes when the Roster/GraphDrawer
    // open or the boot->app transition settles. window.resize does NOT fire for
    // those, so we observe the canvas element directly and re-measure its backing
    // store. The physics center-pull + bounds clamp then re-frame the mesh.
    const ro = new ResizeObserver(() => setupCanvas(canvas))
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const unsub = bus.on((ev) => {
      const g = graphRef.current
      if (ev.type === 'mission-start') {
        setBurst(false)
        const ids = getDefs().map((d) => d.id)
        graphRef.current = createGraph(ids)
        for (const n of g.nodes.values()) graphSetState(g, n.id, 'idle')
      }
      if (ev.type === 'dispatch') addEdge(g, ev.from, ev.to)
      if (ev.type === 'agent-start') graphSetState(g, ev.agent, 'running')
      if (ev.type === 'agent-done') graphSetState(g, ev.agent, 'done')
      if (ev.type === 'fault') graphSetState(g, ev.agent, 'fault')
      if (ev.type === 'mission-complete') {
        for (const n of g.nodes.values()) graphSetState(g, n.id, 'done')
        setBurst(true)
        setTimeout(() => setBurst(false), 1400)
      }
      if (ev.type === 'gate-start') gateActiveRef.current = true
      if (ev.type === 'gate-pass' || ev.type === 'gate-fail') gateActiveRef.current = false
    })
    return () => {
      unsub()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const artifactFlash = new Map<string, number>()
    const tick = (t: number) => {
      const dt = Math.min(t - lastTimeRef.current, 50)
      lastTimeRef.current = t
      const g = graphRef.current
      const effectiveDt = dt * speed
      const theme = resolveTheme()
      // Always keep the backing store in sync with the displayed CSS size.
      // This is the bulletproof responsiveness guarantee: the canvas tracks its
      // container on every frame, independent of whether ResizeObserver / a
      // window resize / a layout transition has fired yet. Setting width only
      // when it actually differs avoids per-frame clears.
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const wantW = Math.max(1, Math.round(rect.width * dpr))
      const wantH = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== wantW || canvas.height !== wantH) setupCanvas(canvas)
      const cw = canvas.width
      const ch = canvas.height
      stepPhysics(g, effectiveDt, { w: cw / dpr, h: ch / dpr }, t)
      computeFit(g, cw / dpr, ch / dpr)
      tickEdges(g, effectiveDt, missionActive)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      drawGrid(ctx, canvas.width, canvas.height, theme)
      drawCoreGlow(ctx, canvas.width, canvas.height, t, theme)
      if (!useSettingsStore.getState().reducedMotion) {
        drawDust(ctx, canvas.width, canvas.height, t, theme)
      }
      const s = {
        width: canvas.width,
        height: canvas.height,
        dpr: window.devicePixelRatio || 1,
        zoom: 1,
        panX: 0,
        panY: 0,
        time: t,
        worldFit: g.worldFit || 1,
      }
      applyCamera(ctx, s)
      const usedEdges = graphOpen ? new Set(g.edges.map((e) => `${e.from}->${e.to}`)) : undefined
      drawEdges(ctx, g, s, t, usedEdges, theme)
      drawNodes(ctx, g, s, selectedId, t, artifactFlash, tokenRate, theme)
      if (useMissionStore.getState().status === 'complete') drawDoneGlyph(ctx, s.width / s.dpr, s.height / s.dpr, theme)
      ctx.restore()
      drawVignette(ctx, canvas.width, canvas.height, theme)
      raf = requestAnimationFrame(tick)
    }
    lastTimeRef.current = performance.now()
    raf = requestAnimationFrame(tick)

    const onResize = () => canvasRef.current && setupCanvas(canvasRef.current)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [missionActive, speed, selectedId, graphOpen, tokenRate])

  const handleCanvasClick = () => {
    setSelected(null)
    useMeshStore.setState({ selectedId: null })
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        onClick={handleCanvasClick}
        role="img"
        aria-label="AXIOM mission canvas showing agent mesh and event particles"
      />

      {/* running sheen */}
      <AnimatePresence>
        {missionActive && (
          <motion.div
            key="sheen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0"
          >
            <motion.div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-info/60 to-transparent"
              animate={{ y: ['0%', '100%'], opacity: [0, 0.8, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* convergence burst */}
      <AnimatePresence>
        {burst && (
          <motion.div
            key="burst"
            className="pointer-events-none absolute left-1/2 top-1/2"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-success"
                initial={{ width: 8, height: 8, opacity: 0.9 }}
                animate={{ width: 520, height: 520, opacity: 0 }}
                transition={{ duration: 1.3, delay: i * 0.18, ease: 'easeOut' }}
              />
            ))}
            <motion.div
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success shadow-[0_0_24px_8px_rgb(60_200_130/0.6)]"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 2.5, 1] }}
              transition={{ duration: 0.7, ease: 'backOut' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* top-left mission context */}
      <AnimatePresence>
        {objective && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute left-4 top-4 max-w-[60%]"
          >
            <div className="rounded-md border border-border bg-card/70 px-3 py-2 backdrop-blur-sm">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Objective</div>
              <div className="mt-0.5 truncate text-xs text-foreground">{objective}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom-left status legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3 rounded-md border border-border bg-card/70 px-3 py-1.5 font-mono text-[10px] text-muted-foreground backdrop-blur-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-info" /> running
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> idle
        </span>
        <AnimatePresence>
          {status === 'complete' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 text-success"
            >
              · converged
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* centered empty-state: only before a mission starts */}
      <AnimatePresence>
        {isStandby && (
          <motion.div
            key="awaiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            data-testid="awaiting-overlay"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-center"
          >
            <span className="relative flex h-16 w-16 items-center justify-center">
              <motion.span
                className="absolute inset-0 rounded-full border border-info/40"
                animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.span
                className="absolute inset-0 rounded-full border border-info/30"
                animate={{ scale: [1, 2.4], opacity: [0.4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 1.2 }}
              />
              <span className="h-2 w-2 rounded-full bg-info shadow-[0_0_18px_6px_rgb(127_180_255/0.5)]" />
            </span>
            <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Awaiting mission activity
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/60">
              press Run to dispatch the mesh
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
