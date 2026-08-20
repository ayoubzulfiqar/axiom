import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'

export interface FeedEntry {
  id: number
  tag: string
  text: string
  sys?: boolean
  time: number
  meta?: Record<string, string>
}

const MAX_ENTRIES = 90
const FLUSH_MS = 80

let idCounter = 0
const pending: FeedEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

/** Ambient token activity rate (tokens/sec), smoothed — used as a live "pulse" indicator. */
let tokenRate = 0
let tokenWindow: number[] = []

export interface FeedState {
  entries: FeedEntry[]
  tokenRate: number
}

export const useFeedStore = create<FeedState>(() => ({
  entries: [],
  tokenRate: 0,
}))

function flush() {
  if (pending.length === 0) return
  const batch = pending.splice(0, pending.length)
  useFeedStore.setState((s) => {
    const next = [...s.entries, ...batch]
    if (next.length > MAX_ENTRIES) next.splice(0, next.length - MAX_ENTRIES)
    return { entries: next }
  })
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush()
    // decay token rate between flushes
    const now = Date.now()
    tokenWindow = tokenWindow.filter((t) => now - t < 1000)
    tokenRate = tokenWindow.length
    useFeedStore.setState({ tokenRate })
  }, FLUSH_MS)
}

export function bindFeedBus() {
  bus.on((ev: BusEvent) => {
    // Raw token streams are ambient — they drive the canvas "breathing" pulse,
    // not feed line-items (which would bury the high-signal events).
    if (ev.type === 'token') {
      tokenWindow.push(Date.now())
      tokenRate = tokenWindow.length
      return
    }
    if (ev.type === 'plan-step') {
      pending.push({ id: ++idCounter, tag: 'PLAN', text: `Step ${ev.n}/${ev.total}: ${ev.thought}`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'dispatch') {
      pending.push({ id: ++idCounter, tag: 'DISP', text: `${ev.from} -> ${ev.to} [${ev.tag}]`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'agent-start') {
      pending.push({ id: ++idCounter, tag: 'RUN', text: `${ev.agent} started`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'agent-done') {
      pending.push({ id: ++idCounter, tag: 'DONE', text: `${ev.agent} done`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'fault') {
      pending.push({ id: ++idCounter, tag: 'FAULT', text: `${ev.agent}: ${ev.error}`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'mission-start') {
      pending.push({ id: ++idCounter, tag: 'SYS', text: `Mission started: ${ev.objective}`, sys: true, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'mission-complete') {
      pending.push({ id: ++idCounter, tag: 'SYS', text: 'Mission complete.', sys: true, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'artifact-stored') {
      pending.push({ id: ++idCounter, tag: 'ARTIFACT', text: `${ev.kind} ← ${ev.agent}: ${ev.summary}`, time: Date.now(), meta: { artifactId: ev.id } })
      scheduleFlush()
      return
    }
    if (ev.type === 'gate-start' || ev.type === 'gate-pass' || ev.type === 'gate-fail') {
      const tag = ev.type === 'gate-start' ? 'GATE' : ev.type === 'gate-pass' ? 'PASS' : 'FAIL'
      pending.push({ id: ++idCounter, tag, text: `${ev.gate}: ${ev.detail ?? ''}`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'policy-applied') {
      pending.push({ id: ++idCounter, tag: 'POLICY', text: `${ev.agent} → ${ev.policy}: ${ev.detail}`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'convergence') {
      pending.push({ id: ++idCounter, tag: 'CONV', text: `Convergence (${ev.reason}) after ${ev.rounds} rounds`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'approval-requested') {
      pending.push({ id: ++idCounter, tag: 'APPR', text: `Approval requested: ${ev.summary}`, time: Date.now() })
      scheduleFlush()
      return
    }
    if (ev.type === 'checkpoint-updated') {
      pending.push({ id: ++idCounter, tag: 'CHK', text: `Checkpoint step ${ev.step} (${ev.status})`, time: Date.now() })
      scheduleFlush()
      return
    }
  })
}

export function clearFeed() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  pending.length = 0
  tokenWindow = []
  tokenRate = 0
  useFeedStore.setState({ entries: [], tokenRate: 0 })
}
