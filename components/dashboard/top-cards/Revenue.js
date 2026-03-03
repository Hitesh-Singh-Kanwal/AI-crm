'use client'

import { TrendingUp } from 'lucide-react'
import { CARD, LABEL_PRIMARY, VALUE_DARK, TREND_POSITIVE, ICON_POSITIVE } from './cardStyles'

/**
 * Admin Dashboard – Revenue card.
 * Figma: Studio CRM node 300-27862. Value dark; trend green.
 */
export default function RevenueCard({ value = '$560', trend = '12% last week' } = {}) {
  return (
    <div className="flex flex-col min-w-0 p-4 sm:p-5" style={CARD}>
      <p style={LABEL_PRIMARY}>REVENUE</p>
      <p style={VALUE_DARK}>{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <TrendingUp style={{ width: 14, height: 14, color: ICON_POSITIVE }} strokeWidth={2.5} />
        <span style={TREND_POSITIVE}>{trend}</span>
      </div>
    </div>
  )
}
