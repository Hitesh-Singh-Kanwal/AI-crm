'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const PAGE_SIZE = 25

function formatCell(row, column) {
  const value = row[column.key]
  if (column.format) return column.format(value, row)
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/**
 * Presentational "Show full details" table modal — pure props in, no data
 * fetching of its own. Shared by both the owner-dashboard and main-dashboard
 * DetailsButton containers, since their detail rows come from different
 * backend endpoints but render the same way.
 */
export default function DetailsModal({ open, onClose, title, rows = [], total = 0, page = 1, limit = PAGE_SIZE, isLoading, onPageChange, columns }) {
  const totalPages = Math.max(Math.ceil(total / limit), 1)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="5xl">
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {isLoading && rows.length === 0 ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No records for this selection.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row._id || i}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>{formatCell(row, col)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        {total > limit && (
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {page} of {totalPages} · {total.toLocaleString()} total
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(page - 1, 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPageChange(Math.min(page + 1, totalPages))}
                disabled={page >= totalPages}
                className="rounded-lg border border-border p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { PAGE_SIZE }
