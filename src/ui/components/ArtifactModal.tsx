import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { useBus } from '../stores/bus'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRef } from 'react'
import { Button } from '../components/ui/button'
import { Copy } from 'lucide-react'

export function ArtifactModal({ artifact }: { artifact: string }) {
  const open = useBus((s) => s.artifact !== null)
  const setArtifact = useBus((s) => s.setArtifact)
  const ref = useRef<HTMLDivElement>(null)

  const handleCopy = async () => {
    if (!artifact) return
    await navigator.clipboard.writeText(artifact)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && setArtifact(null)}>
      <DialogContent className="bg-panel border-line text-ink max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest flex items-center justify-between">
            <span>ARTIFACT</span>
            <Button size="sm" variant="outline" onClick={handleCopy} className="border-line text-ink">
              <Copy size={14} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div ref={ref} className="prose prose-invert max-w-none font-mono text-xs leading-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact}</ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  )
}
