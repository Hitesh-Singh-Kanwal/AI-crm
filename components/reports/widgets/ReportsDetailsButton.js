'use client'

import { useRouter } from 'next/navigation'
import { Table2 } from 'lucide-react'
import { setDashboardDetailsRequest } from '@/lib/dashboardDetailsStore'

/**
 * Reports overview drill-down — same UX as dashboard/owner DetailsButton,
 * but returns to /reports and can hit either details API.
 */
export default function ReportsDetailsButton({
  title,
  metric,
  rangeDays = 30,
  params,
  columns,
  source = 'dashboard',
  compact = false,
}) {
  const router = useRouter()

  function handleClick() {
    setDashboardDetailsRequest({
      source,
      title,
      metric,
      rangeDays,
      params,
      columns,
      backHref: '/reports',
    })
    router.push('/dashboard/details')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Show full details"
      className={
        compact
          ? 'flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
          : 'flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground'
      }
    >
      <Table2 className="h-3 w-3" />
      {!compact && 'Details'}
    </button>
  )
}

export const LEAD_DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'studio', label: 'Studio' },
  { key: 'uploadType', label: 'Source' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

export function paymentDetailColumns(formatMoney) {
  return [
    { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
    { key: 'customer', label: 'Customer' },
    { key: 'type', label: 'Type' },
    { key: 'method', label: 'Method' },
    { key: 'amount', label: 'Amount', format: (v) => formatMoney(v) },
  ]
}

export const ACTIVITY_DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'channel', label: 'Channel' },
  { key: 'lead', label: 'Lead' },
  { key: 'status', label: 'Status' },
]

export const OUTSTANDING_DETAIL_COLUMNS = [
  { key: 'customer', label: 'Customer' },
  { key: 'studio', label: 'Studio' },
  { key: 'source', label: 'Source' },
  { key: 'name', label: 'Package / Membership' },
  { key: 'dueAmount', label: 'Due', format: (v) => `$${Number(v || 0).toLocaleString()}` },
]
