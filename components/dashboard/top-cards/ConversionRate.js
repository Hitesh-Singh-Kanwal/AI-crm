'use client'

import { TrendingDown } from 'lucide-react'
import { CARD, LABEL_PRIMARY, VALUE_DARK, TREND_NEGATIVE, ICON_NEGATIVE } from './cardStyles'

/**
 * Admin Dashboard – Conversion Rate card.
 * Figma: Studio CRM node 300-27862. Value dark; trend red/destructive.
 */
export default function ConversionRateCard({ value = '17%', trend = '0.5% vs last week' } = {}) {
  return (
    <div className="flex flex-col min-w-0 p-4 sm:p-5" style={CARD}>
      <p style={LABEL_PRIMARY}>CONVERSION RATE</p>
      <p style={VALUE_DARK}>{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <TrendingDown style={{ width: 14, height: 14, color: ICON_NEGATIVE }} strokeWidth={2.5} />
        <span style={TREND_NEGATIVE}>{trend}</span>
      </div>
    </div>
  )
}
