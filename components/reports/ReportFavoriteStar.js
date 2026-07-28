'use client'

import { cn } from '@/lib/utils'

export function ReportFavoriteStar({ favorited, onToggle, label = 'Toggle favorite', className }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={favorited}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle?.()
      }}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-muted',
        favorited ? 'text-amber-500' : 'text-muted-foreground/50 hover:text-muted-foreground',
        className
      )}
    >
      {favorited ? '★' : '☆'}
    </button>
  )
}
