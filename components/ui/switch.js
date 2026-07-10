'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Switch = forwardRef(function Switch({ checked, onChange, onCheckedChange, onClick, className = '', ...props }, ref) {
  const handleClick = (e) => {
    e.stopPropagation()
    const next = !checked
    onChange?.(next)
    onCheckedChange?.(next)
    onClick?.(e)
  }
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
        checked ? 'bg-[var(--studio-primary)]' : 'bg-muted-foreground/30',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
})

export { Switch }
export default Switch
