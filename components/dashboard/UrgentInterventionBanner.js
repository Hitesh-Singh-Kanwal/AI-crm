'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * Urgent Human Intervention Required banner.
 * Figma: Studio CRM node 301-29277 – red-50 fill, 1px error border, 12px radius, 16px padding.
 */
const defaultStats = {
  leadsWaiting: 8,
  avgWaitMins: 47,
  waitingOver1Hour: 3,
}

const RED_ERROR = 'hsl(var(--destructive))'

export default function UrgentInterventionBanner({ stats = defaultStats }) {
  const { leadsWaiting, avgWaitMins, waitingOver1Hour } = stats

  return (
    <div
      className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 w-full rounded-xl border border-red-600 bg-red-50 p-4 min-h-[68px] dark:bg-red-950/30 dark:border-red-500"
    >
      <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4">
        {/* Urgent pill – red bg, white text */}
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full font-medium text-white text-xs shrink-0"
          style={{ background: RED_ERROR, fontFamily: 'Inter, sans-serif' }}
        >
          Urgent
        </span>

        {/* Main title – dark grey/black, slightly smaller */}
        <span
          className="font-medium shrink-0 text-sm text-foreground"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          Human Intervention Required
        </span>

        {/* Vertical divider */}
        <span
          className="hidden sm:inline-block w-px h-5 shrink-0 bg-border"
          aria-hidden
        />

        {/* Metrics – dark text, thin vertical dividers */}
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
          <span className="font-[family-name:Inter] text-foreground">Leads Waiting</span>
          <span className="w-px h-4 bg-border shrink-0" aria-hidden />
          <span className="font-[family-name:Inter] text-foreground">
            Avg wait: {avgWaitMins} mins
          </span>
          <span className="w-px h-4 bg-border shrink-0" aria-hidden />
          <span className="font-[family-name:Inter] text-foreground">
            {waitingOver1Hour} waiting over 1 hour
          </span>
          <span
            className="font-bold ml-0.5 text-sm"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 16,
              color: RED_ERROR,
            }}
          >
            {leadsWaiting}
          </span>
        </div>
      </div>

      <Link
        href="/inbox"
        className="flex items-center gap-1 font-medium shrink-0 transition-colors hover:opacity-80 text-xs text-foreground font-[family-name:Inter] text-[13px]"
      >
        View Queue
        <ChevronRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
      </Link>
    </div>
  )
}
