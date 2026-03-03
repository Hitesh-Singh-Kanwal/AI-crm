'use client'

import { NewLeadsCard, TotalBookingsCard, ConversionRateCard, RevenueCard } from './top-cards'

/**
 * Four KPI cards at top of Admin Dashboard.
 * Figma: Studio CRM Admin Dashboard – node 300-27862.
 * Composed from separate components: NewLeads, TotalBookings, ConversionRate, Revenue.
 */
export default function DashboardTopCards() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      style={{ gap: 16 }}
    >
      <NewLeadsCard />
      <TotalBookingsCard />
      <ConversionRateCard />
      <RevenueCard />
    </div>
  )
}
