import type { BusEvent } from './types'

type Listener = (ev: BusEvent) => void

const bus = {
  listeners: new Set<Listener>(),

  on(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  },

  off(fn: Listener) {
    this.listeners.delete(fn)
  },

  emit(ev: BusEvent) {
    for (const fn of this.listeners) {
      try {
        fn(ev)
      } catch {
        // swallow listener errors
      }
    }
  },

  once(fn: Listener) {
    const wrapper = (ev: BusEvent) => {
      this.off(wrapper)
      fn(ev)
    }
    this.on(wrapper)
    return () => this.off(wrapper)
  },
}

export default bus
