'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'
import { getEffectiveBranch } from '@/lib/auth'
import { buildReportQuery } from '@/lib/reports/reportFilters'

export function ReportDrillPanel({ open, onClose, reportSlug, recordId, title, renderDetail, filters = {} }) {
  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  // Same fallback as useReportData: an untouched Studio filter follows the
  // location switcher explicitly rather than relying on the header alone —
  // some detail endpoints scope supplementary data (e.g. revenue) by it too.
  const effectiveFilters = filters.studioId ? filters : { ...filters, studioId: getEffectiveBranch() || '' }
  const filterKey = buildReportQuery(effectiveFilters, { page: 1, pageSize: 1 })

  useEffect(() => {
    if (!open || !recordId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setDetail(null)
    api.get(`/api/reports/${reportSlug}/${encodeURIComponent(recordId)}?${filterKey}`).then((res) => {
      if (cancelled) return
      if (!res.success) {
        setError(res.error || 'Failed to load detail')
      } else {
        setDetail(res.data)
      }
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, recordId, reportSlug, filterKey])

  return (
    <Sheet open={open} onClose={onClose} side="right">
      <SheetContent onClose={onClose} side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="p-4 text-sm text-destructive">{error}</p>}
        {!isLoading && !error && detail && renderDetail(detail)}
      </SheetContent>
    </Sheet>
  )
}
