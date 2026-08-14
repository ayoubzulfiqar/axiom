import { useRef, useEffect } from 'react'
import { useMissionStore } from '../../stores/mission'
import { useMeshStore } from '../../stores/mesh'
import { useSettingsStore } from '../../stores/settings'
import { getDefs } from '../../engine/agents'
import { addEdge, createGraph, stepPhysics, tickEdges, setNodeState as graphSetState } from '../../engine/graph'
import { setupCanvas, drawGrid, drawDust, drawVignette, applyCamera } from '../../render/scene'
import { drawNodes, drawOrchestratorRadar, drawDoneGlyph } from '../../render/nodes'
import { drawEdges } from '../../render/edges'
import { setSelected } from '../../render/input'
import bus from '../../engine/bus'

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef(createGraph([]))
  const lastTimeRef = useRef<number>(0)
  const missionActive = useMissionStore((s: { status: string }) => s.status === 'running' || s.status === 'paused')
  const speed = useSettingsStore((s: { speed: number }) => s.speed)
  const selectedId = useMeshStore((s: { selectedId: string | null }) => s.selectedId)

  useEffect(() => {
    const ids = getDefs().map((d) => d.id)
    graphRef.current = createGraph(ids)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setupCanvas(canvas)
  }, [])

  useEffect(() => {
    const unsub = bus.on((ev) => {
      const g = graphRef.current
      if (ev.type === 'mission-start') {
        const ids = getDefs().map((d) => d.id)
        graphRef.current = createGraph(ids)
        for (const n of g.nodes.values()) graphSetState(g, n.id, 'idle')
      }
      if (ev.type === 'dispatch') {
        addEdge(g, ev.from, ev.to)
      }
      if (ev.type === 'agent-start') {
        graphSetState(g, ev.agent, 'running')
      }
      if (ev.type === 'agent-done') {
        graphSetState(g, ev.agent, 'done')
      }
      if (ev.type === 'fault') {
        graphSetState(g, ev.agent, 'fault')
      }
      if (ev.type === 'mission-complete') {
        for (const n of g.nodes.values()) graphSetState(g, n.id, 'done')
      }
    })
    return () => { unsub() }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const tick = (t: number) => {
      const dt = Math.min(t - lastTimeRef.current, 50)
      lastTimeRef.current = t
      const g = graphRef.current
      const effectiveDt = dt * speed
      stepPhysics(g, effectiveDt)
      tickEdges(g, effectiveDt, missionActive)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      drawGrid(ctx, canvas.width, canvas.height)
      if (!useSettingsStore.getState().reducedMotion) {
        drawDust(ctx, canvas.width, canvas.height, t)
      }
      const s = {
        width: canvas.width,
        height: canvas.height,
        dpr: window.devicePixelRatio || 1,
        zoom: 1,
        panX: 0,
        panY: 0,
        time: t,
      }
      applyCamera(ctx, s)
      drawEdges(ctx, g, s, t)
      drawNodes(ctx, g, s, selectedId, t)
      if (missionActive) drawOrchestratorRadar(ctx, s.width / s.dpr, s.height / s.dpr, t)
      if (useMissionStore.getState().status === 'complete') drawDoneGlyph(ctx, s.width / s.dpr, s.height / s.dpr)
      ctx.restore()
      drawVignette(ctx, canvas.width, canvas.height)
      raf = requestAnimationFrame(tick)
    }
    lastTimeRef.current = performance.now()
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      if (!canvasRef.current) return
      setupCanvas(canvasRef.current)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [missionActive, speed, selectedId])

  const handleCanvasClick = () => {
    setSelected(null)
    useMeshStore.setState({ selectedId: null })
  }

  return (
    <div className="flex-1 relative">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={handleCanvasClick}
        role="img"
        aria-label="AXIOM mission canvas showing agent mesh and event particles"
      />
    </div>
  )
}
