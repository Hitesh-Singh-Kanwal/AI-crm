'use client'

import MainLayout from '@/components/layout/MainLayout'
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

const kpiCards = [
  { title: 'Total Revenue', value: '$247,280', trend: '15.3% from last period', trendType: 'up' },
  { title: 'New Leads', value: '342', trend: '8.2% from last period', trendType: 'up' },
  { title: 'Conversion Rate', value: '24.8%', trend: '3.1% from last period', trendType: 'up' },
  { title: 'Avg Deal Size', value: '$2,453', trend: '0.8% from last period', trendType: 'down' },
]

const revenueTrendData = [
  { month: 'Jan', revenue: 35000, target: 30000 },
  { month: 'Feb', revenue: 38000, target: 32000 },
  { month: 'Mar', revenue: 42000, target: 35000 },
  { month: 'Apr', revenue: 39000, target: 37000 },
  { month: 'May', revenue: 45000, target: 40000 },
  { month: 'Jun', revenue: 48000, target: 42000 },
  { month: 'Jul', revenue: 43000, target: 41000 },
  { month: 'Aug', revenue: 46000, target: 43000 },
  { month: 'Sep', revenue: 49000, target: 45000 },
  { month: 'Oct', revenue: 52000, target: 48000 },
  { month: 'Nov', revenue: 50000, target: 47000 },
  { month: 'Dec', revenue: 54000, target: 50000 },
]

const pipelineData = [
  { name: 'New Leads', value: 25, color: '#FDBBD9' },
  { name: 'Contracted', value: 10, color: '#FB9BC7' },
  { name: 'Qualified', value: 5, color: '#FA6DAD' },
  { name: 'Proposal', value: 40, color: '#F72585' },
  { name: 'Won', value: 20, color: '#E12279' },
]

const leadSourcesData = [
  { name: 'Website', value: 450 },
  { name: 'Referral', value: 320 },
  { name: 'Social', value: 280 },
  { name: 'Walk-in', value: 150 },
  { name: 'Events', value: 110 },
]

const conversionFunnelData = [
  { stage: 'Leads', count: 100, percentage: 100 },
  { stage: 'Contracted', count: 250, percentage: 25 },
  { stage: 'Qualified', count: 700, percentage: 70 },
  { stage: 'Proposal', count: 400, percentage: 40 },
  { stage: 'Won', count: 650, percentage: 65 },
]

const weeklyActivityData = [
  { day: 'Mon', calls: 45, emails: 120, sms: 80 },
  { day: 'Tue', calls: 52, emails: 135, sms: 90 },
  { day: 'Wed', calls: 48, emails: 115, sms: 75 },
  { day: 'Thu', calls: 61, emails: 140, sms: 95 },
  { day: 'Fri', calls: 55, emails: 125, sms: 85 },
  { day: 'Sat', calls: 30, emails: 70, sms: 50 },
  { day: 'Sun', calls: 20, emails: 45, sms: 30 },
]

const chartCardClass =
  'rounded-[20px] border-2 p-5 bg-white border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]'

function Trend({ type = 'up', text }) {
  const isUp = type === 'up'
  const color = isUp ? '#00AA34' : '#EF4444'
  return (
    <div className="mt-1 flex items-center gap-1 text-[14px] font-medium" style={{ color }}>
      <span aria-hidden>{isUp ? '↗' : '↘'}</span>
      <span>{text}</span>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <MainLayout title="Reports" subtitle="Track performance and gain insights">
      <div className="space-y-6 py-2">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.title} className={chartCardClass}>
              <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
                {card.title}
              </p>
              <h3
                className="mt-1 text-[38px] font-bold leading-[1.21]"
                style={{ background: 'linear-gradient(180deg, #6B7280 13%, #050312 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
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
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip />
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

                {/* Figma-like outside labels */}
                <div className="absolute left-[48px] top-[20px] text-[14px] leading-[20px] text-[#64748B]">New Leads: 25%</div>
                <div className="absolute left-[38px] top-[88px] text-[14px] leading-[20px] text-[#64748B]">Contracted: 10%</div>
                <div className="absolute left-[66px] top-[146px] text-[14px] leading-[20px] text-[#64748B]">Qualified: 5%</div>
                <div className="absolute right-[32px] top-[118px] text-[14px] leading-[20px] text-[#64748B]">Proposal: 40%</div>
                <div className="absolute right-[70px] top-[20px] text-[14px] leading-[20px] text-[#64748B]">Won: 20%</div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {pipelineData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm text-[#64748B]">
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
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
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
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="var(--side-gradient-start)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="emails" fill="#4CC9F0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sms" fill="var(--side-gradient-end)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-[#64748B]">
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
                    <span className="font-medium text-slate-900">{stage.stage}</span>
                    <span className="text-[#64748B]">{stage.count} ({stage.percentage}%)</span>
                  </div>
                  <div className="h-5 w-full overflow-hidden rounded-full bg-[#EDFAFE]">
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


