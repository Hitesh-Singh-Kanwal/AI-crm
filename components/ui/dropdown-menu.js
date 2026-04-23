'use client'

import { useState, createContext, useContext, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

const DropdownContext = createContext()

function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideTrigger = ref.current?.contains(event.target)
      const insideContent = contentRef.current?.contains(event.target)
      if (!insideTrigger && !insideContent) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef, contentRef }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

function DropdownMenuTrigger({ children, asChild }) {
  const { open, setOpen, triggerRef } = useContext(DropdownContext)

  if (asChild) {
    return (
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {children}
      </div>
    )
  }

  return (
    <button ref={triggerRef} onClick={() => setOpen(!open)} className="focus:outline-none">
      {children}
    </button>
  )
}

function DropdownMenuContent({ className, align = 'end', children }) {
  const { open, setOpen, triggerRef, contentRef } = useContext(DropdownContext)
  const [pos, setPos] = useState(null) // { top, left, minWidth }

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }

    const raf = requestAnimationFrame(() => {
      const triggerEl = triggerRef?.current
      const contentEl = contentRef.current
      if (!triggerEl || !contentEl) return

      const triggerRect = triggerEl.getBoundingClientRect()
      const contentRect = contentEl.getBoundingClientRect()
      const vh = window.innerHeight
      const vw = window.innerWidth
      const gap = 4

      // Vertical: prefer below, flip above if not enough space
      let top
      const spaceBelow = vh - triggerRect.bottom
      const spaceAbove = triggerRect.top
      if (spaceBelow >= contentRect.height + gap || spaceBelow >= spaceAbove) {
        top = triggerRect.bottom + gap
      } else {
        top = triggerRect.top - contentRect.height - gap
      }
      top = Math.max(gap, Math.min(top, vh - contentRect.height - gap))

      // Horizontal: align per prop, clamp to viewport
      let left
      if (align === 'end') {
        left = triggerRect.right - contentRect.width
      } else if (align === 'center') {
        left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
      } else {
        left = triggerRect.left
      }
      left = Math.max(gap, Math.min(left, vw - contentRect.width - gap))

      setPos({ top, left })
    })

    return () => cancelAnimationFrame(raf)
  }, [open, align, triggerRef])

  if (!open) return null

  const content = (
    <div
      ref={contentRef}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden', top: 0, left: 0 }}
      className={cn(
        'fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-scale-in',
        className
      )}
    >
      <div onClick={() => setOpen(false)}>{children}</div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null
}

function DropdownMenuItem({ className, ...props }) {
  return (
    <div
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({ className, ...props }) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
}

function DropdownMenuLabel({ className, ...props }) {
  return <div className={cn('px-2 py-1.5 text-sm font-semibold', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
