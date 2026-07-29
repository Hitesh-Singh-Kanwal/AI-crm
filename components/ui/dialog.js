'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Nested dialogs: only lock scroll once; only topmost handles Escape. */
let bodyScrollLockCount = 0
let dialogStack = []

function Dialog({ open, onClose, children, maxWidth = 'lg' }) {
  const [mounted, setMounted] = useState(false)
  const [stackDepth, setStackDepth] = useState(0)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    bodyScrollLockCount += 1
    if (bodyScrollLockCount === 1) {
      document.body.style.overflow = 'hidden'
    }

    const entry = { getOnClose: () => onCloseRef.current }
    dialogStack.push(entry)
    setStackDepth(dialogStack.length)

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      const top = dialogStack[dialogStack.length - 1]
      if (top !== entry) return
      e.preventDefault()
      e.stopPropagation()
      onCloseRef.current?.()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      dialogStack = dialogStack.filter((d) => d !== entry)
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)
      if (bodyScrollLockCount === 0) {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open || !mounted) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }

  const layer = Math.max(1, stackDepth)

  return createPortal(
    <div
      className="fixed inset-0 overflow-y-auto"
      role="presentation"
      style={{ zIndex: 100 + layer }}
    >
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onCloseRef.current?.()}
        aria-hidden="true"
      />
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 md:p-6">
        <div
          role="dialog"
          aria-modal="true"
          className={`relative my-auto w-full ${maxWidthClasses[maxWidth] || maxWidthClasses.lg} animate-scale-in`}
          style={{ zIndex: 101 + layer }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function DialogContent({ className, children, onClose }) {
  return (
    <div className={cn('relative rounded-xl border-2 border-border bg-card text-card-foreground shadow-2xl p-6', className)}>
      {onClose && (
        <button
          type="button"
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

function DialogHeader({ className, ...props }) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}

function DialogTitle({ className, ...props }) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

function DialogDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

function DialogFooter({ className, ...props }) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
