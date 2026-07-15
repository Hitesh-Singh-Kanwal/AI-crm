'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import api from '@/lib/api'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const DEFAULT_KPIS = [
  { title: 'Total Revenue', value: '$0', trend: '—', trendType: 'up' },
  { title: 'New Leads', value: '0', trend: '—', trendType: 'up' },
  { title: 'Conversion Rate', value: '0.0%', trend: '—', trendType: 'up' },
  { title: 'Avg Deal Size', value: '$0', trend: '—', trendType: 'up' },
]

// Pie/legend colours kept from the original design; stages beyond five cycle.
const PIPELINE_PALETTE = ['#FDBBD9', '#FB9BC7', '#FA6DAD', '#F72585', '#E12279']
// The five hand-placed outside-label positions from the original layout.
const PIPELINE_LABEL_POS = [
  'absolute left-[48px] top-[20px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute left-[38px] top-[88px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute left-[66px] top-[146px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute right-[32px] top-[118px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute right-[70px] top-[20px] text-[14px] leading-[20px] text-muted-foreground',
]

const RANGE_PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '12M', days: 365 },
]

const chartCardClass =
  'rounded-[20px] border-2 p-5 bg-card border-border text-card-foreground shadow-sm'

function Trend({ type = 'up', text }) {
  const isUp = type === 'up'
  return (
    <div
      className={`mt-1 flex items-center gap-1 text-[14px] font-medium ${
        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      <span aria-hidden>{isUp ? '↗' : '↘'}</span>
      <span>{text}</span>
    </div>
  )
}

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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.title} className={chartCardClass}>
              <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
                {card.title}
              </p>
              <h3 className="mt-1 text-[38px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
                {card.value}
              </h3>
              <Trend type={card.trendType} text={card.trend} />
            </div>
          ))}
        </section>

        <section className={chartCardClass}>
          <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
            Revenue Trend
          </h3>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="reportRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--side-gradient-end)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--side-gradient-end)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={rechartsTooltipContentStyle} />
                <Area type="monotone" dataKey="revenue" stroke="var(--side-gradient-end)" strokeWidth={2} fill="url(#reportRevenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={chartCardClass}>
            <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Sales Pipeline</h3>
            <div className="mt-5">
              <div className="relative mx-auto h-[200px] w-full max-w-[575px]">
                <div className="absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pipelineData} dataKey="value" cx="50%" cy="50%" innerRadius={0} outerRadius={84} stroke="none">
                        {pipelineData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Outside labels — same positions as the original, filled from data */}
                {pipelineData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className={PIPELINE_LABEL_POS[i]}>
                    {item.name}: {item.percentage}%
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={chartCardClass}>
            <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Lead Sources</h3>
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadSourcesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={rechartsTooltipContentStyle} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="url(#leadBarGradient)" />
                  <defs>
                    <linearGradient id="leadBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--bar-gradient-start)" />
                      <stop offset="100%" stopColor="var(--bar-gradient-end)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className={chartCardClass}>
            <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Weekly Activity</h3>
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivityData} barCategoryGap={24} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={rechartsTooltipContentStyle} />
                  <Bar dataKey="calls" fill="var(--side-gradient-start)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="emails" fill="#4CC9F0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sms" fill="var(--side-gradient-end)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--side-gradient-start)]" />Calls</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4CC9F0]" />Email</span>
              <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--side-gradient-end)]" />SMS</span>
            </div>
          </div>

          <div className={chartCardClass}>
            <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Conversion Funnel</h3>
            <div className="mt-4 space-y-3">
              {conversionFunnelData.map((stage) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{stage.stage}</span>
                    <span className="text-muted-foreground">{stage.count} ({stage.percentage}%)</span>
                  </div>
                  <div className="h-5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${stage.percentage}%`, background: 'var(--side-gradient-css)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}
