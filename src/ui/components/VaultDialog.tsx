import { useState } from 'react'
import { useBus } from '../stores/bus'
import { useVaultStore } from '../../stores/vault'
import { connectKey, disconnectKey } from '../../stores/vault'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Loader2 } from 'lucide-react'

export function VaultDialog() {
  const open = useBus((s: { vaultOpen: boolean }) => s.vaultOpen)
  const setOpen = useBus((s: { setVaultOpen: (v: boolean) => void }) => s.setVaultOpen)
  const connected = useVaultStore((s: { connected: boolean }) => s.connected)
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
      <DialogContent className="bg-panel border-line text-ink">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest">VAULT</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            data-testid="vault-input"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="sk-..."
            type="password"
            className="bg-transparent border-line text-ink"
          />
          <label className="flex items-center gap-2 text-xs text-dim">
            <input type="checkbox" checked={sessionOnly} onChange={(e) => setSessionOnly(e.target.checked)} />
            Session only
          </label>
          <div className="flex gap-2">
            <Button disabled={loading} onClick={handleConnect} className="bg-ink text-bg">
              {loading ? <Loader2 className="animate-spin" size={14} /> : 'CONNECT'}
            </Button>
            {connected && (
              <Button variant="ghost" onClick={() => { disconnectKey(); setOpen(false) }}>CLEAR</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
