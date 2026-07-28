'use client'

import { Card } from '@/components/dashboard/widgets/shared'
import { FunnelStage, FunnelConnector } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Lead' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'introBooked', label: 'Intro Booked' },
  { key: 'introAttended', label: 'Intro Attended' },
  { key: 'firstPurchase', label: 'First Purchase' },
]

export default function ConversionFunnelReportsWidget({ funnel, rangeDays, onRangeChange }) {
  const report1 = funnel?.report1 || { leadCount: 0, introBookedCount: 0, ratePct: 0, avgDaysToBook: 0 }
  const report2 = funnel?.report2 || { introCount: 0, firstPurchaseCount: 0, ratePct: 0, avgDaysToPurchase: 0 }
  const showRatePct = report1.introBookedCount
    ? Math.round((report2.introCount / report1.introBookedCount) * 100)
    : 0

  return (
    <Card>
      <WidgetHeader
        title="Lead → Intro → First Purchase"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Lead → Intro → First Purchase — full details"
            metric="conversionFunnelReports"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Report 1 (Lead to Intro Booked) and Report 2 (Intro to First Purchase) chained into one funnel.
      </p>
      <div className="mt-4 flex items-stretch justify-center gap-1 overflow-x-auto pb-1">
        <FunnelStage
          label="Leads"
          value={report1.leadCount.toLocaleString()}
        />
        <FunnelConnector ratePct={report1.ratePct} caption={`avg ${report1.avgDaysToBook}d to book`} />
        <FunnelStage
          label="Intro Booked"
          value={report1.introBookedCount.toLocaleString()}
        />
        <FunnelConnector ratePct={showRatePct} caption="show rate" />
        <FunnelStage
          label="Intros Attended"
          value={report2.introCount.toLocaleString()}
        />
        <FunnelConnector ratePct={report2.ratePct} caption={`avg ${report2.avgDaysToPurchase}d to buy`} />
        <FunnelStage
          label="First Purchase"
          value={report2.firstPurchaseCount.toLocaleString()}
        />
      </div>
    </Card>
  )
}
