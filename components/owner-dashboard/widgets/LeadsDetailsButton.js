'use client'

import { useRouter } from 'next/navigation'
import { Table2 } from 'lucide-react'
import { setDashboardDetailsRequest } from '@/lib/dashboardDetailsStore'

/**
 * "Show full details" for Leads by Source — reuses the existing /api/lead
 * list endpoint directly (same query-building path as the Leads page) rather
 * than the owner-overview drill-down route, since leads aren't part of that
 * aggregation and already have a perfectly good paginated list endpoint.
 * Navigates to the shared details page instead of opening a modal.
 */
export default function LeadsDetailsButton({ rangeDays, columns }) {
  const router = useRouter()

  function handleClick() {
    setDashboardDetailsRequest({
      source: 'leads',
      title: 'Leads by Source — full details',
      rangeDays,
      columns,
      backHref: '/dashboard',
    })
    router.push('/dashboard/details')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Table2 className="h-3 w-3" />
      Details
    </button>
  )
}
