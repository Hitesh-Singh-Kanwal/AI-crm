'use client'

import { useRouter } from 'next/navigation'
import { Table2 } from 'lucide-react'
import { setDashboardDetailsRequest } from '@/lib/dashboardDetailsStore'

/**
 * Self-contained "Show full details" trigger for a main-dashboard widget —
 * stashes its drill-down request (metric/rangeDays/params/columns, hitting
 * /api/dashboard/overview/details) and navigates to the shared details page
 * instead of opening a modal. Mirrors
 * components/owner-dashboard/widgets/DetailsButton.js, which hits the
 * separate owner-overview drill-down endpoint instead.
 */
export default function DetailsButton({ title, metric, rangeDays, params, columns, compact = false, backHref = '/dashboard' }) {
  const router = useRouter()

  function handleClick() {
    setDashboardDetailsRequest({ source: 'dashboard', title, metric, rangeDays, params, columns, backHref })
    router.push('/dashboard/details')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
  )
}
