import { useBus } from '../stores/bus'
import { Button } from '../components/ui/button'
import { useMissionStore } from '../../stores/mission'
import { useSettingsStore } from '../../stores/settings'
import bus from '../../engine/bus'
import { loadCheckpoint } from '../../engine/checkpoints'
import { getMissionCost } from '../../engine/cost'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AnimatedNumber, springSnappy } from '../fx'
import { useThemeStore } from '../../stores/theme'
import { Moon, Sun } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  standby: 'STANDBY',
  running: 'RUNNING',
  paused: 'PAUSED',
  complete: 'COMPLETE',
  fault: 'FAULT',
  'awaiting-approval': 'AWAITING APPROVAL',
}

function StatusDot({ status }: { status: string }) {
  const tone =
    status === 'running'
      ? 'bg-info'
      : status === 'complete'
        ? 'bg-success'
        : status === 'fault'
          ? 'bg-destructive'
          : status === 'awaiting-approval'
            ? 'bg-warning'
            : 'bg-muted-foreground'
  const active = status === 'running'
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <>
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-info"
            animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-info"
            animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
          />
        </>
      )}
      <motion.span
        className={`relative inline-flex h-2 w-2 rounded-full ${tone}`}
        animate={active ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 1.2, repeat: active ? Infinity : 0 }}
      />
    </span>
  )
}

function Toggle({
  checked,
  onChange,
  label,
  testid,
}: {
  checked: boolean
  onChange: () => void
  label: string
  testid: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      data-testid={testid}
      className="group flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
    >
      <span
        className={`relative h-4 w-7 rounded-full border transition-colors ${
          checked ? 'border-foreground bg-foreground' : 'border-border bg-transparent'
        }`}
      >
        <motion.span
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-background shadow-sm"
          animate={{ left: checked ? 14 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
      {label}
    </button>
  )
}

export function Header() {
  const setRosterOpen = useBus((s) => s.setRosterOpen)
  const setVaultOpen = useBus((s) => s.setVaultOpen)
  const setObjectiveOpen = useBus((s) => s.setObjectiveOpen)
  const setHistoryOpen = useBus((s) => s.setHistoryOpen)
  const simMode = useBus((s) => s.simMode)
  const toggleSim = () => useBus.getState().setSimMode(!simMode)
  const status = useMissionStore((s) => s.status)
  const approvalRequired = useSettingsStore((s) => s.approvalRequired)
  const toggleApproval = () => useSettingsStore.getState().setApprovalRequired(!approvalRequired)
  const [gating, setGating] = useState(false)
  const [missionCost, setMissionCost] = useState(0)
  const resume = () => {
    const cp = loadCheckpoint('current')
    if (cp) {
      bus.emit({ type: 'mission-start', objective: cp.missionId })
      useMissionStore.setState({ status: 'running', objective: cp.missionId, step: cp.currentStep, total: cp.currentStep + 1 })
    }
  }

  useEffect(() => {
    const unsub = bus.on((ev) => {
      if (ev.type === 'gate-start') setGating(true)
      if (ev.type === 'gate-pass' || ev.type === 'gate-fail') setGating(false)
      if (ev.type === 'cost-updated') setMissionCost(getMissionCost().totalCostUsd)
    })
    return () => {
      unsub()
    }
  }, [])

  const t = useMissionStore((s) => s.telemetry)
  const active = status === 'running' || status === 'complete'

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springSnappy}
      className="z-30 flex h-14 shrink-0 items-center justify-between gap-2 overflow-x-hidden border-b border-border bg-card/40 px-4 backdrop-blur-xl"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <motion.div
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-card"
            whileHover={{ rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <span className="block h-2.5 w-2.5 rotate-45 border border-foreground/70" />
          </motion.div>
          <div className="leading-none">
            <div className="text-sm font-semibold tracking-[0.28em] text-foreground">AXIOM</div>
            <div className="mt-0.5 hidden text-[9px] uppercase tracking-[0.22em] text-muted-foreground sm:block">
              Orchestration Console
            </div>
          </div>
        </div>
        <div className="ml-2 hidden items-center gap-2 rounded-full border border-border bg-background/60 px-2.5 py-1 sm:flex">
          <StatusDot status={status} />
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {STATUS_LABEL[status] ?? status}
          </span>
          <AnimatePresence>
            {gating && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden text-[9px] uppercase tracking-[0.16em] text-warning"
              >
                · gating
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <div className="mr-1 hidden items-center gap-3 md:flex">
          <Toggle checked={simMode} onChange={toggleSim} label="Sim" testid="sim-toggle" />
          <Toggle checked={approvalRequired} onChange={toggleApproval} label="Approval" testid="approval-toggle" />
          <AnimatePresence>
            {active && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2"
              >
                <span
                  className="rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[10px] text-muted-foreground"
                  data-testid="telemetry-chip"
                >
                  ⚡ <AnimatedNumber value={t.actualSpeedup} suffix="x" /> /{' '}
                  <AnimatedNumber value={t.theoreticalSpeedup} suffix="x" /> max
                </span>
                <span
                  className="rounded-md border border-border bg-background/60 px-2 py-1 font-mono text-[10px] text-muted-foreground"
                  data-testid="cost-chip"
                >
                  $ <AnimatedNumber value={missionCost} decimals={4} />
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Button
          variant="ghost"
          size="sm"
          data-testid="theme-toggle"
          className="hidden text-muted-foreground sm:inline-flex"
          onClick={() => useThemeStore.getState().toggle()}
          aria-label="Toggle theme"
        >
          <motion.span
            key={useThemeStore.getState().theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex items-center"
          >
            {useThemeStore((s) => s.theme) === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </motion.span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-muted-foreground sm:inline-flex"
          onClick={() => setHistoryOpen(true)}
        >
          Log
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-muted-foreground md:inline-flex"
          onClick={() => setRosterOpen(true)}
        >
          Mesh
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-muted-foreground md:inline-flex"
          onClick={() => setVaultOpen(true)}
        >
          Vault
        </Button>
        {status === 'paused' && (
          <Button data-testid="resume-button" variant="outline" size="sm" onClick={resume}>
            Resume
          </Button>
        )}
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
          <Button data-testid="run-button" size="sm" onClick={() => setObjectiveOpen(true)}>
            <span className="sm:hidden">Run</span>
            <span className="hidden sm:inline">Run Mission</span>
          </Button>
        </motion.div>
      </div>
    </motion.header>
  )
}
