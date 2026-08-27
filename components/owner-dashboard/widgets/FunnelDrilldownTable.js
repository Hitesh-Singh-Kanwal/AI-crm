'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useOwnerOverviewDetails } from '@/lib/hooks/useAnalyticsOverview'

const PAGE_SIZE = 10
// One wide fetch, then paged/filtered on the client — funnel stages need
// client-side filtering on boolean/count columns the details endpoint returns
// but doesn't filter by.
const FETCH_LIMIT = 500

function renderCell(row, col) {
  const raw = row[col.key]
  if (col.format) {
    try {
      return col.format(raw, row)
    } catch {
      /* fall through */
    }
  }
  if (typeof raw === 'boolean') return raw ? 'Yes' : '—'
  if (raw === null || raw === undefined || raw === '') return '—'
  return String(raw)
}

/**
 * Inline drill-down table shown beneath a funnel when one of its stage cards is
 * clicked. Fetches the widget's full detail set once (same endpoint as the
 * "Details" button) and narrows it to the clicked stage with `filterFn`.
 */
export default function FunnelDrilldownTable({ title, metric, rangeDays, columns, filterFn, onClose }) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useOwnerOverviewDetails({
    metric,
    range: rangeDays,
    page: 1,
    limit: FETCH_LIMIT,
    enabled: true,
  })

  const allRows = data?.rows || []
  const rows = filterFn ? allRows.filter(filterFn) : allRows
  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1)
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--studio-primary)]">
          {title}
          {!isLoading && <span className="ml-2 font-medium normal-case text-muted-foreground">{rows.length.toLocaleString()} records</span>}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No records for this stage.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="whitespace-nowrap bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row, i) => (
                <TableRow key={row._id || row.id || i} className="even:bg-muted/20">
                  {columns.map((col) => (
                    <TableCell key={col.key} className="whitespace-nowrap text-sm">
                      {renderCell(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {rows.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[12px] text-muted-foreground">
          <span>
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={safePage <= 1}
              className="rounded-lg border border-border p-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={safePage >= totalPages}
              className="rounded-lg border border-border p-1 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
