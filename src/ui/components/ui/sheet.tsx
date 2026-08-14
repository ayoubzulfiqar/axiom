import * as React from 'react'
import { cn } from '../lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
}

function Sheet({ open, onOpenChange, side = 'right', children }: SheetProps) {
  if (!open) return null
  const sideClasses: Record<string, string> = {
    top: 'inset-x-0 top-0 border-b',
    bottom: 'inset-x-0 bottom-0 border-t',
    left: 'inset-y-0 left-0 border-r',
    right: 'inset-y-0 right-0 border-l',
  }
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className={cn('absolute bg-panel/95 backdrop-blur-xl border-line text-ink shadow-lg', sideClasses[side])}>{children}</div>
    </div>
  )
}

function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('h-full', className)} {...props} />
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-2 p-4 border-b border-line', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold tracking-widest', className)} {...props} />
}

function SheetTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props}>{children}</button>
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger }
