'use client'

import { useState } from 'react'
import { Table2 } from 'lucide-react'
import DetailsModal, { PAGE_SIZE } from '@/components/shared/DetailsModal'
import { useDashboardOverviewDetails } from '@/lib/hooks/useAnalyticsOverview'

/**
 * Self-contained "Show full details" trigger for a main-dashboard widget —
 * owns its open state and drives DetailsModal from this dashboard's
 * drill-down endpoint (/api/dashboard/overview/details) for the given
 * `metric`. Fetching only starts once the modal is opened. Mirrors
 * components/owner-dashboard/widgets/DetailsButton.js, which hits the
 * separate owner-overview drill-down endpoint instead.
 */
export default function DetailsButton({ title, metric, rangeDays, params, columns, compact = false }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useDashboardOverviewDetails({
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
        title="Show full details"
        className={
          compact
            ? 'flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
            : 'flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
        }
      >
        <Table2 className="h-3 w-3" />
        {!compact && 'Details'}
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
