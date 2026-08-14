import { AnimatePresence, motion } from 'motion/react'
import { BootOverlay } from './components/BootOverlay'
import { Roster } from './components/Roster'
import { Feed } from './components/Feed'
import { Stage } from './components/Stage'
import { DetailCard } from './components/DetailCard'
import { VaultDialog } from './components/VaultDialog'
import { ArtifactModal } from './components/ArtifactModal'
import { HistoryDrawer } from './components/HistoryDrawer'
import { ObjectivePrompt } from './components/ObjectivePrompt'
import { useBus } from './stores/bus'
import { useVaultStore } from '../stores/vault'
import { useSettingsStore } from '../stores/settings'
import '../index.css'

export default function App() {
  const booted = useBus((s) => s.booted)
  const vaultOpen = useVaultStore((s) => s.vaultOpen)
  const artifact = useBus((s) => s.artifact)
  const objectiveOpen = useBus((s) => s.objectiveOpen)
  const historyOpen = useBus((s) => s.historyOpen)
  const speed = useSettingsStore((s) => s.speed)

  return (
    <div className="h-full w-full relative overflow-hidden bg-bg text-ink font-display">
      <AnimatePresence>
        {!booted && <BootOverlay />}
      </AnimatePresence>
      <div className="pt-16 h-full flex">
        <Roster />
        <Stage />
        <Feed />
      </div>
      <DetailCard />
      <AnimatePresence>
        {vaultOpen && <VaultDialog />}
      </AnimatePresence>
      <AnimatePresence>
        {artifact && <ArtifactModal artifact={artifact} />}
      </AnimatePresence>
      <AnimatePresence>
        {objectiveOpen && <ObjectivePrompt />}
      </AnimatePresence>
      <AnimatePresence>
        {historyOpen && <HistoryDrawer />}
      </AnimatePresence>
      <motion.div
        className="fixed bottom-4 right-4 z-50 px-3 py-1 rounded-full border border-line bg-panel text-xs font-mono text-dim"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        SPEED {speed}x
      </motion.div>
    </div>
  )
}
