'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { api } from '@/lib/api'

export function ReportDrillPanel({ open, onClose, reportSlug, recordId, title, renderDetail }) {
  const [detail, setDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !recordId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setDetail(null)
    api.get(`/api/reports/${reportSlug}/${recordId}`).then((res) => {
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
  }, [open, recordId, reportSlug])

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
