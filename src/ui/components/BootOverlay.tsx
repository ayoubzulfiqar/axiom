import { useCallback, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { useMissionStore } from '../../stores/mission'
import { useVaultStore } from '../../stores/vault'
import { useBus } from '../stores/bus'
import { runSimulation } from '../../engine/simulator'
import { loadKey } from '../../engine/vault'

export function BootOverlay() {
  const ref = useRef<HTMLDivElement>(null)
  const setVaultOpen = useVaultStore((s: { setVaultOpen: (v: boolean) => void }) => s.setVaultOpen)
  const setObjectiveOpen = useBus((s: { setObjectiveOpen: (v: boolean) => void }) => s.setObjectiveOpen)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()
      tl.to(el, { opacity: 1, duration: 0.6 })
        .to('.boot-line', { opacity: 1, duration: 0.3, stagger: 0.26 })
        .to('.boot-progress', { width: '100%', duration: 0.8, ease: 'power2.inOut' })
        .to(el, { opacity: 0, duration: 0.7, delay: 0.3 })
    }, el)
    return () => ctx.revert()
  }, [])

  const handleSim = useCallback(() => {
    useMissionStore.setState({ status: 'running', objective: 'SIM mission', startedAt: Date.now() })
    runSimulation('SIM mission')
    setObjectiveOpen(false)
  }, [setObjectiveOpen])

  const handleLive = useCallback(() => {
    if (!loadKey()) {
      setVaultOpen(true)
      return
    }
    setObjectiveOpen(true)
  }, [setVaultOpen, setObjectiveOpen])

  return (
    <div ref={ref} className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-md flex flex-col items-center justify-center gap-8 opacity-0">
      <div className="w-6 h-6 rotate-45 bg-ink mb-4" />
      <h1 className="text-2xl font-bold tracking-[0.3em]">AXIOM</h1>
      <div className="flex flex-col gap-2 font-mono text-xs text-dim w-64">
        <div className="boot-line opacity-0">initializing orchestrator</div>
        <div className="boot-line opacity-0">loading agent mesh</div>
        <div className="boot-line opacity-0">binding event bus</div>
        <div className="boot-line opacity-0">renderer online</div>
      </div>
      <div className="w-64 h-1 bg-ghost rounded overflow-hidden">
        <div className="boot-progress h-full bg-ink w-0 transition-none" />
      </div>
      <div className="flex gap-3">
        <button onClick={handleSim} className="px-4 py-2 border border-line bg-panel hover:bg-ink hover:text-bg transition rounded text-xs font-bold tracking-wider">
          SIM MODE
        </button>
        <button onClick={handleLive} className="px-4 py-2 border border-line bg-panel hover:bg-ink hover:text-bg transition rounded text-xs font-bold tracking-wider">
          LIVE MISSION
        </button>
      </div>
    </div>
  )
}
