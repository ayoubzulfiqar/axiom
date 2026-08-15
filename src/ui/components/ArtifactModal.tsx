import { useBus } from '../stores/bus'
import { useMissionStore } from '../../stores/mission'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ArtifactModal() {
  const artifact = useBus((s: { artifact: string | null }) => s.artifact)
  const setDetailOpen = useBus((s: { setDetailOpen: (v: boolean) => void }) => s.setDetailOpen)
  const verified = useMissionStore((s: { verified: boolean | null }) => s.verified)

  if (!artifact) return null

  return (
    <Dialog open={!!artifact} onOpenChange={() => { }}>
      <DialogContent className="bg-panel border-line text-ink max-w-2xl max-h-[80vh]" data-testid="artifact-modal">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest">
            ARTIFACT
            {verified === true && <span className="ml-2 text-[10px] font-mono text-ink/70">VERIFIED</span>}
            {verified === false && <span className="ml-2 text-[10px] font-mono text-red-400">UNVERIFIED</span>}
          </DialogTitle>
        </DialogHeader>
        <div data-testid="artifact-body" className="text-xs max-h-[60vh] overflow-y-auto prose prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact}</ReactMarkdown>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" data-testid="copy-button" onClick={() => navigator.clipboard.writeText(artifact)} className="bg-ink text-bg">COPY</Button>
          <Button size="sm" variant="ghost" onClick={() => { setDetailOpen(false); useBus.setState({ artifact: null }) }}>CLOSE</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
