'use client'

import { useEffect, useState } from 'react'
import { RowsPerPage } from '@/components/shared/RowsPerPage'

export const ANALYTICS_PAGE_SIZES = [5, 10, 25, 50]

export function useAnalyticsPagination(items) {
  const list = Array.isArray(items) ? items : []
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [items])

  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    pageRows: list.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize: (next) => {
      setPageSize(next)
      setPage(1)
    },
  }
}

export function AnalyticsTableFooter({ page, pageSize, total, totalPages, onPageChange, onPageSizeChange }) {
  if (!total) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <RowsPerPage value={pageSize} onChange={onPageSizeChange} options={ANALYTICS_PAGE_SIZES} />
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function PaginatedRows({ rows, children }) {
  const paging = useAnalyticsPagination(rows)
  const footer = (
    <AnalyticsTableFooter
      page={paging.page}
      pageSize={paging.pageSize}
      total={paging.total}
      totalPages={paging.totalPages}
      onPageChange={paging.setPage}
      onPageSizeChange={paging.setPageSize}
    />
  )
  return children(paging.pageRows, footer)
}
