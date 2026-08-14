import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { useBus } from '../../ui/stores/bus'

export function BootOverlay() {
  const lineRefs = useRef<HTMLDivElement[]>([])
  const barRef = useRef<HTMLDivElement>(null)
  const setBooted = useBus((s) => s.setBooted)

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => setBooted(true),
    })
    tl.fromTo(lineRefs.current, { opacity: 0, x: -12 }, { opacity: 1, x: 0, stagger: 0.08, duration: 0.3 })
    tl.to(barRef.current, { width: '100%', duration: 0.6, ease: 'power2.inOut' }, '-=0.1')
    tl.to(lineRefs.current, { opacity: 0, duration: 0.2, stagger: 0.04 })
  }, [setBooted])

  const lines = [
    'BOOT SEQUENCE INITIALIZED',
    'LOADING ENGINE MODULES',
    'ESTABLISHING SECURE CHANNEL',
    'MESH READY',
  ]

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center">
      <div className="w-64 space-y-2">
        {lines.map((text, i) => (
          <div
            key={text}
            ref={(el) => { if (el) lineRefs.current[i] = el }}
            className="text-xs font-mono text-ink/80"
          >
            {text}
          </div>
        ))}
        <div className="h-px bg-line">
          <div ref={barRef} className="h-full bg-ink w-0" />
        </div>
      </div>
    </div>
  )
}
