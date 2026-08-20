import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { BootOverlay } from './components/BootOverlay'
import { Roster } from './components/Roster'
import { Feed } from './components/Feed'
import { Stage } from './components/Stage'
import { DetailCard } from './components/DetailCard'
import { VaultDialog } from './components/VaultDialog'
import { ArtifactModal } from './components/ArtifactModal'
import { HistoryDrawer } from './components/HistoryDrawer'
import { ObjectivePrompt } from './components/ObjectivePrompt'
import { Header } from './components/Header'
import { GraphDrawer } from './components/GraphDrawer'
import { ApprovalDialog } from './components/ApprovalDialog'
import { useBus } from './stores/bus'
import { AmbientBackground } from './fx'
import '../index.css'

export default function App() {
  const booted = useBus((s) => s.booted)

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
        <AmbientBackground />
        <AnimatePresence mode="wait">
          {!booted && <BootOverlay key="boot" />}
          {booted && (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex min-w-0 flex-1 flex-col"
            >
              <Header />
              <div className="flex min-w-0 flex-1">
                <Roster />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Feed />
                  <Stage />
                  <DetailCard />
                </div>
              </div>
              <VaultDialog />
              <HistoryDrawer />
              <ObjectivePrompt />
              <GraphDrawer />
              <ApprovalDialog />
              <AnimatePresence>
                <ArtifactModal />
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
