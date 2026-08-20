import { useState } from 'react'
import { useBus } from '../stores/bus'
import { useVaultStore } from '../../stores/vault'
import { connectKey, disconnectKey } from '../../stores/vault'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import { springSnappy } from '../fx'

export function VaultDialog() {
  const open = useBus((s) => s.vaultOpen)
  const setOpen = useBus((s) => s.setVaultOpen)
  const connected = useVaultStore((s) => s.connected)
  const maskedKey = useVaultStore((s) => s.maskedKey)
  const [raw, setRaw] = useState('')
  const [sessionOnly, setSessionOnly] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    await connectKey(raw, sessionOnly)
    setLoading(false)
    setRaw('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen} data-testid="vault-dialog">
      <DialogContent className="max-w-md overflow-hidden p-0">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={springSnappy}
          className="p-6"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-info/40 to-transparent" />
          <DialogClose aria-label="Close" className="absolute right-4 top-4">
            <span className="text-muted-foreground transition-colors hover:text-foreground">✕</span>
          </DialogClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <span className="h-2 w-2 rounded-full bg-info" />
              Vault · API Key
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {connected ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <motion.span
                    className="h-2 w-2 rounded-full bg-success"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  <span className="font-mono text-[11px] text-foreground">{maskedKey || 'connected'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    disconnectKey()
                    setOpen(false)
                  }}
                >
                  Disconnect
                </Button>
              </motion.div>
            ) : (
              <form
                data-testid="vault-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (loading || !raw.trim()) return
                  handleConnect()
                }}
                className="space-y-3"
              >
                <Input
                  data-testid="vault-input"
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder="sk-..."
                  type="password"
                  autoComplete="off"
                  className="border-border focus-visible:border-foreground/50"
                  autoFocus
                />
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={sessionOnly}
                    onChange={(e) => setSessionOnly(e.target.checked)}
                    className="h-3.5 w-3.5 accent-foreground"
                  />
                  Session only (not persisted)
                </label>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button type="submit" disabled={loading || !raw.trim()} className="w-full">
                    {loading ? <Loader2 className="animate-spin" size={14} /> : 'Connect'}
                  </Button>
                </motion.div>
              </form>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
