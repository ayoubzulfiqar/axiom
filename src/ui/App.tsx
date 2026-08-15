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
import { Header } from './components/Header'
import { GraphDrawer } from './components/GraphDrawer'
import { ApprovalDialog } from './components/ApprovalDialog'
import { useBus } from './stores/bus'
import '../index.css'

export default function App() {
  const booted = useBus((s) => s.booted)

  return (
    <div className="h-screen w-screen bg-bg text-ink flex flex-col overflow-hidden">
      {!booted && <BootOverlay />}
      {booted && (
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <div className="flex-1 flex flex-col min-w-0">
            <Roster />
            <div className="flex-1 flex flex-col min-w-0">
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
        </div>
      )}
    </div>
  )
}
