import { useBus } from '../stores/bus'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import bus from '../../engine/bus'
import { motion } from 'motion/react'
import { springSnappy } from '../fx'

export function ApprovalDialog() {
  const open = useBus((s) => s.approvalOpen)
  const setOpen = useBus((s) => s.setApprovalOpen)
  const preview = useBus((s) => s.approvalPreview)

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
      <DialogContent className="max-w-2xl overflow-hidden p-0" data-testid="approval-dialog">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={springSnappy}
          className="p-6"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-warning/50 to-transparent" />
          <DialogClose aria-label="Close" className="absolute right-4 top-4">
            <span className="text-muted-foreground transition-colors hover:text-foreground">✕</span>
          </DialogClose>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <motion.span
                className="h-2 w-2 rounded-full bg-warning"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <DialogTitle className="text-foreground">Approval Required</DialogTitle>
            </div>
          </DialogHeader>
          <div
            data-testid="approval-body"
            className="prose-flat mt-4 max-h-[60vh] overflow-y-auto rounded-md border border-border bg-background/50 p-4"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview ?? ''}</ReactMarkdown>
          </div>
          <DialogFooter className="mt-5">
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={handleReject}>
              Reject
            </Button>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="sm"
                onClick={handleApprove}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                Approve
              </Button>
            </motion.div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
