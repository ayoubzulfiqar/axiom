import { useBus } from '../stores/bus'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import bus from '../../engine/bus'

export function ApprovalDialog() {
  const open = useBus((s: { approvalOpen: boolean }) => s.approvalOpen)
  const setOpen = useBus((s: { setApprovalOpen: (v: boolean) => void }) => s.setApprovalOpen)
  const preview = useBus((s: { approvalPreview: string | null }) => s.approvalPreview)

  if (!open) return null

  const handleApprove = () => {
    setOpen(false)
    useBus.getState().setArtifactOpen(true)
    bus.emit({ type: 'approval-resolved', decision: 'approved' })
  }

  const handleReject = () => {
    setOpen(false)
    bus.emit({ type: 'approval-resolved', decision: 'rejected', feedback: 'User rejected delivery.' })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent className="bg-panel border-line text-ink max-w-2xl max-h-[80vh]" data-testid="approval-dialog">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest">APPROVAL REQUIRED</DialogTitle>
        </DialogHeader>
        <div className="text-xs max-h-[60vh] overflow-y-auto prose prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview ?? ''}</ReactMarkdown>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={handleReject}>REJECT</Button>
          <Button size="sm" className="bg-ink text-bg" onClick={handleApprove}>APPROVE</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
