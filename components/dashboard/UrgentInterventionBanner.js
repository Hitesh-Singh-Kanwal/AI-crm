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

const RED_50 = '#FEF2F2'
const RED_ERROR = '#DC2626'
const TEXT_DARK = '#0F172A'

export default function UrgentInterventionBanner({ stats = defaultStats }) {
  const { leadsWaiting, avgWaitMins, waitingOver1Hour } = stats

  return (
    <div
      className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 w-full"
      style={{
        background: RED_50,
        border: `1px solid ${RED_ERROR}`,
        borderRadius: 12,
        padding: 16,
        minHeight: 68,
      }}
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
          className="font-medium shrink-0 text-sm"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            lineHeight: 1.4,
            color: TEXT_DARK,
          }}
        >
          Human Intervention Required
        </span>

        {/* Vertical divider */}
        <span
          className="hidden sm:inline-block w-px h-5 shrink-0"
          style={{ background: '#E5E7EB' }}
          aria-hidden
        />

        {/* Metrics – dark text, thin vertical dividers */}
        <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
          <span style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>Leads Waiting</span>
          <span className="w-px h-4 bg-slate-300 shrink-0" aria-hidden />
          <span style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
            Avg wait: {avgWaitMins} mins
          </span>
          <span className="w-px h-4 bg-slate-300 shrink-0" aria-hidden />
          <span style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}>
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
        className="flex items-center gap-1 font-medium shrink-0 transition-colors hover:opacity-80 text-xs"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: TEXT_DARK,
        }}
      >
        View Queue
        <ChevronRight style={{ width: 16, height: 16 }} strokeWidth={2.5} />
      </Link>
    </div>
  )
}
