'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder'
import { reportsWidgetRegistry } from '@/components/reports/widgets/registry'
import api from '@/lib/api'

const DEFAULT_KPIS = [
  { title: 'Total Revenue', value: '$0', trend: '—', trendType: 'up' },
  { title: 'New Leads', value: '0', trend: '—', trendType: 'up' },
  { title: 'Conversion Rate', value: '0.0%', trend: '—', trendType: 'up' },
  { title: 'Avg Deal Size', value: '$0', trend: '—', trendType: 'up' },
]

const PIPELINE_PALETTE = ['#FDBBD9', '#FB9BC7', '#FA6DAD', '#F72585', '#E12279']

const RANGE_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '12M', days: 365 },
]

export default function ReportsPage() {
  const [kpiCards, setKpiCards] = useState(DEFAULT_KPIS)
  const [revenueTrendData, setRevenueTrendData] = useState([])
  const [pipelineRaw, setPipelineRaw] = useState([])
  const [leadSourcesData, setLeadSourcesData] = useState([])
  const [weeklyActivityData, setWeeklyActivityData] = useState([])
  const [conversionFunnelData, setConversionFunnelData] = useState([])
  const [rangeDays, setRangeDays] = useState(30)

  useEffect(() => {
    let active = true
    const to = new Date()
    const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000)
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
    api.get(`/api/reports/overview?${params}`).then((res) => {
      if (!active || !res.success || !res.data) return
      const d = res.data
      if (Array.isArray(d.kpis) && d.kpis.length) setKpiCards(d.kpis)
      setRevenueTrendData(d.revenueTrend || [])
      setPipelineRaw(d.pipeline || [])
      setLeadSourcesData(d.leadSources || [])
      setWeeklyActivityData(d.weeklyActivity || [])
      setConversionFunnelData(d.conversionFunnel || [])
    })
    return () => { active = false }
  }, [rangeDays])

  const pipelineTotal = pipelineRaw.reduce((sum, p) => sum + (p.value || 0), 0)
  const pipelineData = pipelineRaw.map((p, i) => ({
    ...p,
    color: PIPELINE_PALETTE[i % PIPELINE_PALETTE.length],
    percentage: pipelineTotal ? Math.round((p.value / pipelineTotal) * 100) : 0,
  }))

  return (
    <MainLayout title="Reports" subtitle="Track performance and gain insights">
      <div className="space-y-6 py-2">
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => setRangeDays(preset.days)}
                className={[
                  'h-8 px-4 rounded-md text-[13px] font-medium transition-colors',
                  rangeDays === preset.days
                    ? 'bg-brand text-brand-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <DashboardBuilder
          page="reports"
          widgets={reportsWidgetRegistry}
          sharedProps={{
            kpiCards,
            revenueTrendData,
            pipelineData,
            leadSourcesData,
            weeklyActivityData,
            conversionFunnelData,
          }}
        />
      </div>
    </MainLayout>
  )
}
