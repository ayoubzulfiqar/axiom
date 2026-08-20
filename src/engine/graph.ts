export interface NodeState {
  id: string
  label: string
  x: number
  y: number
  vx: number
  vy: number
  state: string
  /** animated render radius (grows in on spawn, eases toward target) */
  r: number
  targetR: number
  /** animated state-mix 0..1 used for color blending between idle/active */
  activity: number
  spawn: number
  /** node-growth choreography: born time + stagger delay + spring growth */
  born: number
  delay: number
  growth: number
  gv: number
}

export interface Graph {
  nodes: Map<string, NodeState>
  edges: { from: string; to: string; progress: number }[]
  /** world->screen scale so the graph fills the canvas (recomputed per frame) */
  worldFit: number
}

export function createGraph(ids: string[]): Graph {
  const nodes = new Map<string, NodeState>()
  const n = Math.max(1, ids.length)
  const ring = 220
  ids.forEach((id, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    // slight spiral so it reads as an organic web, not a sterile polygon
    const rad = ring * (0.82 + 0.18 * (i % 2))
    nodes.set(id, {
      id,
      label: id,
      x: Math.cos(angle) * rad,
      y: Math.sin(angle) * rad,
      vx: 0,
      vy: 0,
      state: 'idle',
      r: 26,
      targetR: 26,
      activity: 0,
      spawn: performance.now(),
      born: performance.now(),
      delay: i * 110, // staggered spring-in, like the reference's seed-anchor growth
      growth: 0,
      gv: 0,
    })
  })
  return { nodes, edges: [], worldFit: 1 }
}

export function addEdge(g: Graph, from: string, to: string) {
  if (!g.edges.find((e) => e.from === from && e.to === to)) {
    g.edges.push({ from, to, progress: 0 })
  }
}

/**
 * Compute a scale that maps the graph (laid out around origin) to occupy ~78%
 * of the smaller canvas dimension, so it always fills the panel at any size.
 */
export function computeFit(g: Graph, cssW: number, cssH: number) {
  let maxR = 1
  for (const node of g.nodes.values()) {
    const d = Math.hypot(node.x, node.y) + node.targetR
    if (d > maxR) maxR = d
  }
  const target = Math.min(cssW, cssH) * 0.39
  g.worldFit = target / maxR
}

export function stepPhysics(g: Graph, dt: number, bounds: { w: number; h: number }, now: number) {
  const nodes = Array.from(g.nodes.values())
  const repulsion = 14000
  const damping = 0.82
  const ringR = 210 // desired distance from center -> fills the fitted canvas
  const ringSpring = 0.04
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = repulsion / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      nodes[i].vx -= fx
      nodes[i].vy -= fy
      nodes[j].vx += fx
      nodes[j].vy += fy
    }
  }
  for (const node of nodes) {
    // radial spring holds each node at the ring radius so the web stays filled
    // (gives an organic, evenly-spread mind-map rather than a collapsing dot)
    const dist = Math.hypot(node.x, node.y) || 1
    const radial = (ringR - dist) * ringSpring
    node.vx += (node.x / dist) * radial
    node.vy += (node.y / dist) * radial
    node.vx *= damping
    node.vy *= damping
    node.x += node.vx * dt * 0.01
    node.y += node.vy * dt * 0.01
    // keep nodes inside the fitted canvas area (with margin) — fixes off-canvas drift
    const margin = 40
    const maxX = (bounds.w / 2 - margin) / (g.worldFit || 1)
    const maxY = (bounds.h / 2 - margin) / (g.worldFit || 1)
    if (node.x > maxX) { node.x = maxX; node.vx *= -0.4 }
    if (node.x < -maxX) { node.x = -maxX; node.vx *= -0.4 }
    if (node.y > maxY) { node.y = -maxY; node.vy *= -0.4 }
    if (node.y < -maxY) { node.y = -maxY; node.vy *= -0.4 }
    // staggered spring-in growth (overshoot) — matches the reference's node-growth feel
    const age = now - (node.born + node.delay)
    const gTarget = age > 0 ? 1 : 0
    node.gv += (gTarget - node.growth) * 0.16
    node.gv *= 0.74 // light damping -> subtle overshoot
    node.growth += node.gv
    if (node.growth < 0) node.growth = 0
    if (node.growth > 1.18) node.growth = 1.18
    // ease radius + activity toward targets (fluid growth / state change)
    node.r += (node.targetR - node.r) * Math.min(1, dt * 0.006)
    if (!(node.r > 0)) node.r = 1
    const targetActivity = node.state === 'running' ? 1 : node.state === 'done' ? 0.7 : node.state === 'fault' ? 1 : 0
    node.activity += (targetActivity - node.activity) * Math.min(1, dt * 0.004)
  }
}

/** Edge reveal progress = how grown both endpoints are (0..1). */
export function edgeReveal(g: Graph, from: string, to: string): number {
  const a = g.nodes.get(from)
  const b = g.nodes.get(to)
  if (!a || !b) return 0
  return Math.min(1, Math.min(a.growth, b.growth))
}

export function tickEdges(g: Graph, dt: number, active: boolean) {
  for (const edge of g.edges) {
    if (active) edge.progress = Math.min(1, edge.progress + dt * 0.0025)
  }
}

export function setNodeState(g: Graph, id: string, state: string) {
  const node = g.nodes.get(id)
  if (node) node.state = state
}
