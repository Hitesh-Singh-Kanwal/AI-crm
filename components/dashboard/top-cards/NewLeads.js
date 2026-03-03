'use client'

import { TrendingUp } from 'lucide-react'
import { CARD, LABEL_PRIMARY, VALUE_DARK, TREND_POSITIVE, ICON_POSITIVE } from './cardStyles'

/**
 * Admin Dashboard – New Leads card.
 * Figma node 300-27863: label "NEW LEADS" in purple; number in black.
 */
export default function NewLeadsCard({ value = '32', trend = '0.8% vs last week' } = {}) {
  return (
    <div className="flex flex-col min-w-0 p-4 sm:p-5" style={CARD}>
      <p style={LABEL_PRIMARY}>NEW LEADS</p>
      <p style={VALUE_DARK}>{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <TrendingUp style={{ width: 14, height: 14, color: ICON_POSITIVE }} strokeWidth={2.5} />
        <span style={TREND_POSITIVE}>{trend}</span>
      </div>
    </div>
  )
}
