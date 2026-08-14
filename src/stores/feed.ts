import { create } from 'zustand'
import bus from '../engine/bus'
import type { BusEvent } from '../engine/types'

export interface FeedEntry {
  id: number
  tag: string
  text: string
  sys?: boolean
  time: number
}

const MAX_ENTRIES = 90
const FLUSH_MS = 80

let idCounter = 0
const pending: FeedEntry[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

export interface FeedState {
  entries: FeedEntry[]
}

export const useFeedStore = create<FeedState>(() => ({
  entries: [],
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
  }, FLUSH_MS)
}

export function bindFeedBus() {
  bus.on((ev: BusEvent) => {
    if (ev.type === 'token') {
      pending.push({ id: ++idCounter, tag: 'TOKEN', text: ev.text, time: Date.now() })
      scheduleFlush()
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
  })
}

export function clearFeed() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  pending.length = 0
  useFeedStore.setState({ entries: [] })
}
