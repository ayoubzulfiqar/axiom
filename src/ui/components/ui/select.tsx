import * as React from 'react'
import { cn } from '../lib/utils'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const SelectContext = React.createContext<{ value?: string; onValueChange?: (v: string) => void }>({})

function Select({ value, onValueChange, children }: SelectProps) {
  return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
}

function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  React.useContext(SelectContext)
  return (
    <button className={cn('flex items-center justify-between rounded-md border border-line bg-transparent px-3 py-2 text-sm text-ink', className)} {...props}>
      {children}
    </button>
  )
}

function SelectContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-1 rounded-md border border-line bg-panel/95 backdrop-blur-xl text-ink shadow-lg z-50', className)}>
      {children}
    </div>
  )
}

function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(SelectContext)
  return (
    <button
      onClick={() => ctx.onValueChange?.(value)}
      className={cn('w-full text-left px-3 py-1.5 text-sm hover:bg-ink/10 rounded-sm', ctx.value === value && 'text-ink', className)}
    >
      {children}
    </button>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span>{placeholder}</span>
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
