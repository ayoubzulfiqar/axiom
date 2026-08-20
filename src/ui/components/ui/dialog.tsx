import * as React from 'react'
import { cn } from '../lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  [key: string]: unknown
}

// Lets DialogClose auto-close the dialog without every caller wiring onClick.
const DialogCloseContext = React.createContext<(() => void) | null>(null)

function Dialog({ open, onOpenChange, children, ...rest }: DialogProps) {
  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])
  if (!open) return null
  return (
    <DialogCloseContext.Provider value={close}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        {...rest}
      >
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        <div className="relative z-10 w-full max-w-lg">{children}</div>
      </div>
    </DialogCloseContext.Provider>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-sm font-semibold uppercase tracking-[0.18em] text-foreground', className)}
      {...props}
    />
  )
}

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-6',
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

function DialogClose({ className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const close = React.useContext(DialogCloseContext)
  return (
    <button
      type="button"
      className={cn(
        'absolute right-4 top-4 z-20 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      onClick={(e) => {
        onClick?.(e)
        close?.()
      }}
      {...props}
    />
  )
}

export { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogClose }
