import { AnimatePresence } from 'motion/react'
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
import '../index.css'

export default function App() {
  const booted = useBus((s) => s.booted)

  return (
    <div className="h-screen w-screen bg-bg text-ink flex flex-col overflow-hidden">
      <BootOverlay />
      {booted && (
        <div className="flex-1 flex flex-col min-w-0">
          <Roster />
          <div className="flex-1 flex flex-col min-w-0">
            <Feed />
            <Stage />
            <DetailCard />
          </div>
          <VaultDialog />
          <HistoryDrawer />
          <ObjectivePrompt />
          <AnimatePresence>
            <ArtifactModal />
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
