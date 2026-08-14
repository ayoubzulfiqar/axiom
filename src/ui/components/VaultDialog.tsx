import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useVaultStore } from '../../stores/vault'
import { loadKey } from '../../engine/vault'
import { Loader2, Eye, EyeOff, Trash2 } from 'lucide-react'

export function VaultDialog() {
  const open = useVaultStore((s) => s.vaultOpen)
  const setOpen = useVaultStore((s) => s.setVaultOpen)
  const connected = useVaultStore((s) => s.connected)
  const balance = useVaultStore((s) => s.balance)
  const error = useVaultStore((s) => s.error)
  const masked = useVaultStore((s) => s.maskedKey)
  const setKey = useVaultStore((s) => s.setKey)
  const verifyKey = useVaultStore((s) => s.verifyKey)
  const clearKey = useVaultStore((s) => s.clearKey)
  const [value, setValue] = useState('')
  const [sessionOnly, setSessionOnly] = useState(false)
  const [show, setShow] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const handleConnect = async () => {
    if (!value) return
    setVerifying(true)
    setKey(value, sessionOnly)
    await verifyKey()
    setVerifying(false)
  }

  const handleClear = () => {
    clearKey()
    setValue('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-panel border-line text-ink max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest">BYOK VAULT</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-dim">Your OpenRouter key is stored only in your browser. It never leaves except as an Authorization header.</div>
          {masked && (
            <div className="text-xs font-mono text-ink">
              {show ? (loadKey() ?? '') : masked}
            </div>
          )}
          {balance && (
            <div className="text-xs font-mono text-dim">
              BALANCE {balance.usage?.toFixed(4)} / {balance.limit?.toFixed(2)}
            </div>
          )}
          {connected && <div className="text-xs text-ink font-bold">CONNECTED</div>}
          {error && <div className="text-xs text-red-400">{error}</div>}
          <Input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-or-..."
            className="bg-transparent border-line text-ink"
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-dim">
              <input type="checkbox" checked={sessionOnly} onChange={(e) => setSessionOnly(e.target.checked)} />
              Session only
            </label>
            <button onClick={() => setShow((v) => !v)} className="text-dim">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button onClick={handleConnect} disabled={verifying || !value} className="bg-ink text-bg hover:bg-ink/90">
            {verifying ? <Loader2 className="animate-spin" size={14} /> : 'CONNECT'}
          </Button>
          <Button variant="outline" onClick={handleClear} className="border-line text-ink">
            <Trash2 size={14} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
