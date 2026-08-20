import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

/** Spring-physics number that counts up/down to `value`. */
export function AnimatedNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  className,
}: {
  value: number | null | undefined
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.7 })
  const text = useTransform(spring, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)

  useEffect(() => {
    const target = typeof value === 'number' ? value : 0
    mv.set(target)
  }, [value, mv])

  return <motion.span className={className}>{text}</motion.span>
}

/** Soft spring preset for entrances. */
export const springSoft = { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.9 }
export const springSnappy = { type: 'spring' as const, stiffness: 420, damping: 32 }
export const springGentle = { type: 'spring' as const, stiffness: 140, damping: 22 }

/** Staggered container + item variants for list reveals. */
export const listContainer: import('motion/react').Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
}

export const listItem: import('motion/react').Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: springSoft,
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

/**
 * Ambient aurora backdrop — tasteful, low-opacity, behind everything.
 * Colors are theme-aware via CSS (`.aurora-*` classes swap for light mode).
 */
export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid-fade opacity-50" />
      <motion.div
        className="aurora-1 absolute -left-40 -top-40 h-[55vh] w-[55vh] rounded-full blur-3xl"
        animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="aurora-2 absolute -bottom-40 -right-32 h-[50vh] w-[50vh] rounded-full blur-3xl"
        animate={{ x: [0, -30, 20, 0], y: [0, -20, 25, 0], scale: [1, 1.08, 0.94, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="aurora-3 absolute left-1/2 top-1/3 h-[40vh] w-[40vh] -translate-x-1/2 rounded-full blur-3xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(0_0_0/0.55))]" />
      <div className="dark:hidden absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgb(255_255_255/0.5))]" />
    </div>
  )
}
