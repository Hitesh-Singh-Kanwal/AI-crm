'use client'

import { useState } from 'react'
import { Table2 } from 'lucide-react'
import DetailsModal, { PAGE_SIZE } from './DetailsModal'
import { useOwnerOverviewDetails } from '@/lib/hooks/useAnalyticsOverview'

/**
 * Self-contained "Show full details" trigger for an owner-overview widget —
 * owns its open state and drives DetailsModal from the owner-overview
 * drill-down endpoint (/api/dashboard/owner-overview/details) for the given
 * `metric`. Fetching only starts once the modal is opened.
 */
export default function DetailsButton({ title, metric, rangeDays, params, columns }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useOwnerOverviewDetails({
    metric,
    range: rangeDays,
    page,
    limit: PAGE_SIZE,
    params,
    enabled: open,
  })

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
        title={title}
        columns={columns}
        rows={data?.rows || []}
        total={data?.total || 0}
        page={page}
        limit={PAGE_SIZE}
        isLoading={isLoading}
        onPageChange={setPage}
      />
    </>
  )
}
