'use client'

import { Fragment } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

function Sheet({ open, onClose, children, side = 'right' }) {
  if (!open) return null

  const sideClasses = {
    right: 'right-0 h-full w-[400px] sm:w-[540px] border-l',
    left: 'left-0 h-full w-[400px] sm:w-[540px] border-r',
    top: 'top-0 left-0 right-0 h-[400px] sm:h-[500px] border-b',
    bottom: 'bottom-0 left-0 right-0 h-[400px] sm:h-[500px] border-t',
  }

  const animationClasses = {
    right: 'animate-slide-in-right',
    left: 'animate-slide-in-left',
    top: 'animate-slide-in-top',
    bottom: 'animate-slide-in-bottom',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`fixed ${sideClasses[side]} z-50 bg-card border-border shadow-2xl ${animationClasses[side]}`}>
        {children}
      </div>
    </div>
  )
}

function SheetContent({ className, children, onClose, side = 'right' }) {
  return (
    <div className={cn('relative flex h-full flex-col overflow-y-auto', className)}>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  )
}

function SheetHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}

function SheetTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

function SheetDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function SheetFooter({ className, ...props }) {
  return <div className={cn('mt-auto flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6', className)} {...props} />
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter }
