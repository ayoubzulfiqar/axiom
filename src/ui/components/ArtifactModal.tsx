import { useBus } from '../stores/bus'
import { useMissionStore } from '../../stores/mission'
import { Dialog, DialogContent, DialogTitle, DialogClose } from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion } from 'motion/react'
import { springSoft } from '../fx'

export function ArtifactModal() {
  const artifact = useBus((s) => s.artifact)
  const setDetailOpen = useBus((s) => s.setDetailOpen)
  const verified = useMissionStore((s) => s.verified)

  if (!artifact) return null

  const close = () => {
    setDetailOpen(false)
    useBus.setState({ artifact: null })
  }

  return (
    <Dialog open={!!artifact} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl overflow-hidden p-0" data-testid="artifact-modal">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={springSoft}
          className="flex max-h-[85vh] flex-col"
        >
          <div className="relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/15 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
            />
            <div className="relative flex items-center justify-between border-b border-border bg-card/60 px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <motion.span
                  className="h-2 w-2 rounded-full bg-foreground"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                Artifact
                {verified === true && (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-success">
                    VERIFIED
                  </span>
                )}
                {verified === false && (
                  <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-destructive">
                    UNVERIFIED
                  </span>
                )}
              </DialogTitle>
              <DialogClose aria-label="Close" onClick={close}>
                <span className="text-muted-foreground transition-colors hover:text-foreground">✕</span>
              </DialogClose>
            </div>
          </div>
          <div
            data-testid="artifact-body"
            className="prose-flat flex-1 overflow-y-auto bg-background/30 p-6"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{artifact}</ReactMarkdown>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-card/60 px-6 py-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button size="sm" data-testid="copy-button" onClick={() => navigator.clipboard.writeText(artifact)}>
                Copy
              </Button>
            </motion.div>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={close}>
              Close
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
