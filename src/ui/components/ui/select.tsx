import * as React from 'react'
import { cn } from '../lib/utils'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (v: string) => void
  open: boolean
  setOpen: (v: boolean) => void
}>({ open: false, setOpen: () => {} })

function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(SelectContext)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setOpen(!open)
      }}
      className={cn(
        'flex h-8 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs text-foreground transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {children}
      <svg width="10" height="10" viewBox="0 0 10 10" className={cn('opacity-60 transition-transform', open && 'rotate-180')} aria-hidden>
        <path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </svg>
    </button>
  )
}

function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = React.useContext(SelectContext)
  React.useEffect(() => {
    if (!open) return
    const onDoc = () => setOpen(false)
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [open, setOpen])
  if (!open) return null
  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

function SelectItem({
  value,
  children,
  className,
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const ctx = React.useContext(SelectContext)
  const active = ctx.value === value
  return (
    <button
      type="button"
      onClick={() => {
        ctx.onValueChange?.(value)
        ctx.setOpen(false)
      }}
      className={cn(
        'flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent/60 text-foreground',
        className
      )}
    >
      {children}
      {active && (
        <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 5 L4.2 7 L8 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const ctx = React.useContext(SelectContext)
  return <span className="truncate">{ctx.value ?? placeholder}</span>
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
