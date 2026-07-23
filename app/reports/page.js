'use client'

import { useMemo, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder'
import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { reportsWidgetRegistry } from '@/components/reports/widgets/registry'
import { useReportsOverview } from '@/lib/hooks/useAnalyticsOverview'
import { Button } from '@/components/ui/button'

const DEFAULT_KPIS = [
  { title: 'Total Revenue', value: '$0', trend: '—', trendType: 'up' },
  { title: 'New Leads', value: '0', trend: '—', trendType: 'up' },
  { title: 'Conversion Rate', value: '0.0%', trend: '—', trendType: 'up' },
  { title: 'Avg Deal Size', value: '$0', trend: '—', trendType: 'up' },
]

const PIPELINE_PALETTE = ['#FDBBD9', '#FB9BC7', '#FA6DAD', '#F72585', '#E12279']

export default function ReportsPage() {
  const [range, setRange] = useState(30)
  const { data, error, isLoading, isValidating, mutate } = useReportsOverview(range)

  const sharedProps = useMemo(() => {
    const d = data || {}
    const pipelineRaw = d.pipeline || []
    const pipelineTotal = pipelineRaw.reduce((sum, p) => sum + (p.value || 0), 0)
    const pipelineData = pipelineRaw.map((p, i) => ({
      ...p,
      color: PIPELINE_PALETTE[i % PIPELINE_PALETTE.length],
      percentage: pipelineTotal ? Math.round((p.value / pipelineTotal) * 100) : 0,
    }))

    return {
      kpiCards: Array.isArray(d.kpis) && d.kpis.length ? d.kpis : DEFAULT_KPIS,
      revenueTrendData: d.revenueTrend || [],
      pipelineData,
      leadSourcesData: d.leadSources || [],
      weeklyActivityData: d.weeklyActivity || [],
      conversionFunnelData: d.conversionFunnel || [],
    }
  }, [data])

  const dataLoading = isLoading && !data

  return (
    <MainLayout title="Reports" subtitle="Track performance and gain insights">
      {error && !data && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Couldn’t load reports.{' '}
            <span className="text-muted-foreground">{error.message || 'Please try again.'}</span>
          </p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      <DashboardBuilder
        page="reports"
        widgets={reportsWidgetRegistry}
        sharedProps={sharedProps}
        dataLoading={dataLoading}
        toolbarExtra={
          <div className="flex items-center gap-2">
            {isValidating && data && (
              <span className="text-[11px] text-muted-foreground">Updating…</span>
            )}
            <DateRangePresets value={range} onChange={setRange} />
          </div>
        }
      />
    </MainLayout>
  )
}
