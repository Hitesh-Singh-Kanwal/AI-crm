'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Compact prev / page indicator / next controls for inbox contact pickers.
 */
export default function InboxContactPagination({
  page,
  totalPages,
  total,
  pageSize,
  loading = false,
  onPageChange,
  className,
}) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-2 py-2 border-t border-border bg-muted/30',
        className,
      )}
    >
      <p className="text-xs text-muted-foreground px-1">
        {total === 0
          ? 'No results'
          : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={loading || safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>
        <span className="min-w-[5.5rem] text-center text-xs font-medium text-foreground tabular-nums">
          Page {safePage} of {safeTotalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={loading || safePage >= safeTotalPages}
          onClick={() => onPageChange?.(safePage + 1)}
          aria-label="Next page"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
