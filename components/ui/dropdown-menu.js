'use client'

import { useState, createContext, useContext, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

const DropdownContext = createContext()

function findScrollParent(el) {
  let node = el?.parentElement
  while (node) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight
    if (isScrollable) return node
    node = node.parentElement
  }
  return null
}

function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
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
  const { open, setOpen, triggerRef } = useContext(DropdownContext)
  const contentRef = useRef(null)
  const [side, setSide] = useState('bottom')

  const alignments = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  useEffect(() => {
    if (!open) {
      // Reset so next open re-evaluates from default
      setSide('bottom')
      return
    }

    const raf = requestAnimationFrame(() => {
      const el = contentRef.current
      const triggerEl = triggerRef?.current
      if (!el || !triggerEl) return

      const rect = el.getBoundingClientRect()
      const triggerRect = triggerEl.getBoundingClientRect()

      const scrollParent = findScrollParent(triggerEl)
      const bounds = scrollParent
        ? scrollParent.getBoundingClientRect()
        : { top: 0, bottom: (window.innerHeight || document.documentElement.clientHeight) }

      const padding = 8
      const spaceBelow = bounds.bottom - triggerRect.bottom
      const spaceAbove = triggerRect.top - bounds.top

      const needsFlip = spaceBelow < rect.height + padding && spaceAbove > spaceBelow
      setSide(needsFlip ? 'top' : 'bottom')
    })

    return () => cancelAnimationFrame(raf)
  }, [open, children, triggerRef])

  const sideClass =
    side === 'top'
      ? 'bottom-full mb-2 mt-0 origin-bottom'
      : 'top-full mt-2 origin-top'

  if (!open) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-scale-in',
        alignments[align],
        sideClass,
        className
      )}
    >
      <div onClick={() => setOpen(false)}>{children}</div>
    </div>
  )
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


