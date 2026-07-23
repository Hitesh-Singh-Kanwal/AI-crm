'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'lead', label: 'Lead' },
  { key: 'status', label: 'Status' },
]

export default function FollowUpEffectivenessWidget({ followUpEffectiveness = [], defaultRange }) {
  const hasData = followUpEffectiveness.some((r) => r.sent > 0)

  return (
    <Card>
      <WidgetTitleRow
        title="Follow-up Effectiveness"
        detailsButton={
          <DetailsButton
            title="Follow-up Effectiveness — full details"
            metric="activity"
            rangeDays={defaultRange}
            params={{ channel: 'sms' }}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {hasData ? (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={followUpEffectiveness} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={24}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="contacts" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="sent" name="Sent" fill="var(--side-gradient-start)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reply" name="Reply" fill="var(--side-gradient-end)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="No follow-up SMS data yet." />
      )}
    </Card>
  )
}
