'use client'

import { useState } from 'react'
import { Card } from '@/components/dashboard/widgets/shared'
import { FunnelStage, FunnelConnector } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'
import FunnelDrilldownTable from './FunnelDrilldownTable'

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

const truthy = (v) => v === true || v === 'Yes' || v === 'yes' || v === 1 || v === '1'

// Each card drills into the same detail set, narrowed to that stage.
const STAGES = [
  { key: 'leads', label: 'Leads', filterFn: null },
  { key: 'introBooked', label: 'Intro Booked', filterFn: (r) => truthy(r.introBooked) },
  { key: 'introAttended', label: 'Intros Attended', filterFn: (r) => truthy(r.introAttended) },
  { key: 'firstPurchase', label: 'First Purchase', filterFn: (r) => truthy(r.firstPurchase) },
]

export default function ConversionFunnelReportsWidget({ funnel, rangeDays, onRangeChange }) {
  const [activeStage, setActiveStage] = useState(null)

  const report1 = funnel?.report1 || { leadCount: 0, introBookedCount: 0, ratePct: 0, avgDaysToBook: 0 }
  const report2 = funnel?.report2 || { introCount: 0, firstPurchaseCount: 0, ratePct: 0, avgDaysToPurchase: 0 }
  const showRatePct = report1.introBookedCount
    ? Math.round((report2.introCount / report1.introBookedCount) * 100)
    : 0
  const denom = report1.leadCount || 1
  const bar = (n) => Math.round((n / denom) * 100)

  const toggle = (key) => setActiveStage((cur) => (cur === key ? null : key))
  const active = STAGES.find((s) => s.key === activeStage)

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
        Report 1 (Lead to Intro Booked) and Report 2 (Intro to First Purchase) chained into one funnel. Click a card for
        the underlying records.
      </p>
      <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1">
        <FunnelStage
          label="Leads"
          value={report1.leadCount.toLocaleString()}
          barPct={100}
          highlight={activeStage === null}
          onClick={() => toggle('leads')}
          active={activeStage === 'leads'}
        />
        <FunnelConnector ratePct={report1.ratePct} caption={`avg ${report1.avgDaysToBook}d to book`} />
        <FunnelStage
          label="Intro Booked"
          value={report1.introBookedCount.toLocaleString()}
          barPct={bar(report1.introBookedCount)}
          onClick={() => toggle('introBooked')}
          active={activeStage === 'introBooked'}
        />
        <FunnelConnector ratePct={showRatePct} caption="show rate" />
        <FunnelStage
          label="Intros Attended"
          value={report2.introCount.toLocaleString()}
          barPct={bar(report2.introCount)}
          onClick={() => toggle('introAttended')}
          active={activeStage === 'introAttended'}
        />
        <FunnelConnector ratePct={report2.ratePct} caption={`avg ${report2.avgDaysToPurchase}d to buy`} />
        <FunnelStage
          label="First Purchase"
          value={report2.firstPurchaseCount.toLocaleString()}
          barPct={bar(report2.firstPurchaseCount)}
          onClick={() => toggle('firstPurchase')}
          active={activeStage === 'firstPurchase'}
        />
      </div>

      {active && (
        <FunnelDrilldownTable
          title={active.label}
          metric="conversionFunnelReports"
          rangeDays={rangeDays}
          columns={DETAIL_COLUMNS}
          filterFn={active.filterFn}
          onClose={() => setActiveStage(null)}
        />
      )}
    </Card>
  )
}
