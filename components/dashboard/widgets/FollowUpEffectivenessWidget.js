'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle, rechartsTooltipCursor, rechartsTooltipItemStyle } from '@/lib/chartStyles'
import { Card, WidgetTitleRow, EmptyChart } from './shared'
import { BAR_GRADIENT_DEFS, BAR_FILL, BAR_FILL_SOFT } from '@/components/charts/barGradients'
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
              {BAR_GRADIENT_DEFS}
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="contacts" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={rechartsTooltipContentStyle}
                cursor={rechartsTooltipCursor}
                itemStyle={rechartsTooltipItemStyle}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="sent" name="Sent" fill={BAR_FILL_SOFT} radius={[8, 8, 4, 4]} />
              <Bar dataKey="reply" name="Reply" fill={BAR_FILL} radius={[8, 8, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="No follow-up SMS data yet." />
      )}
    </Card>
  )
}
