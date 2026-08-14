import * as React from 'react'

type VariantProps = cnVariants & cnSizes

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

const buttonVariants = {
  variant: {
    default: 'bg-ink text-bg hover:bg-ink/90',
    outline: 'border border-line bg-transparent hover:border-ink',
    ghost: 'hover:bg-panel',
    secondary: 'bg-panel text-ink hover:bg-ghost',
  } as const,
  size: {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    icon: 'h-9 w-9',
  } as const,
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50',
      buttonVariants.variant[variant],
      buttonVariants.size[size],
      className
    )
    return <button className={classes} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button }
export { cn } from '../lib/utils'

type cnVariants = { variant?: keyof typeof buttonVariants.variant }
type cnSizes = { size?: keyof typeof buttonVariants.size }
