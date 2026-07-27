'use client'

import { useEffect, useState } from 'react'
import { Table2 } from 'lucide-react'
import api from '@/lib/api'
import { buildLeadQueryParams } from '@/lib/lead-filter-fields'
import DetailsModal, { PAGE_SIZE } from './DetailsModal'

function dateOnly(d) {
  return d.toISOString().slice(0, 10)
}

function rangeDates(days) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: dateOnly(from), to: dateOnly(to) }
}

/**
 * "Show full details" for Leads by Source — reuses the existing /api/lead
 * list endpoint directly (same query-building path as the Leads page) rather
 * than the owner-overview drill-down route, since leads aren't part of that
 * aggregation and already have a perfectly good paginated list endpoint.
 */
export default function LeadsDetailsButton({ rangeDays, columns }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const { from, to } = rangeDates(rangeDays)
    const params = buildLeadQueryParams({
      page,
      limit: PAGE_SIZE,
      filters: {
        conditions: [
          { field: 'createdFrom', operator: 'eq', value: from },
          { field: 'createdTo', operator: 'eq', value: to },
        ],
        conditionLogic: 'AND',
      },
    })

    api.get(`/api/lead?${params.toString()}`).then((res) => {
      if (cancelled) return
      const pagination = res.pagination ?? res.data?.pagination
      setData({ rows: res.success ? res.data || [] : [], total: res.success ? pagination?.total ?? 0 : 0 })
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, page, rangeDays])

  function handleClose() {
    setOpen(false)
    setPage(1)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
      >
        <Table2 className="h-3 w-3" />
        Details
      </button>
      <DetailsModal
        open={open}
        onClose={handleClose}
        title="Leads by Source — full details"
        columns={columns}
        rows={data?.rows || []}
        total={data?.total || 0}
        page={page}
        limit={PAGE_SIZE}
        isLoading={loading}
        onPageChange={setPage}
      />
    </>
  )
}
