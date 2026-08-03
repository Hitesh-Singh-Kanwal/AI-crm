'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { rechartsTooltipContentStyle } from '@/lib/chartStyles'

export default function PipelineChart({ data }) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="var(--chart-1)"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}


