'use client'

import { Users, UserPlus, DollarSign, TrendingUp, TrendingDown, Lightbulb, ChevronRight } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import { dashboardStats } from '@/data/dummyData'
import { getEffectiveBranch, isSuperAdmin, isAdmin } from '@/lib/auth'
import { branches } from '@/data/dummyData'
import { cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── Chart / Table Data ──────────────────────────────────────────────

const bookingTrendData = [
  { week: 'Week 1', rate: 12 },
  { week: 'Week 2', rate: 15 },
  { week: 'Week 3', rate: 13 },
  { week: 'Week 4', rate: 16 },
  { week: 'Week 5', rate: 14 },
  { week: 'Week 6', rate: 18 },
  { week: 'Week 7', rate: 21 },
  { week: 'Week 8', rate: 22 },
]

const aiAgentRevenueData = [
  { month: 'Jan',  y2026: 6000,  y2025: 4000  },
  { month: 'Feb',  y2026: 5500,  y2025: 3000  },
  { month: 'Mar',  y2026: 7000,  y2025: 5000  },
  { month: 'Apr',  y2026: 6500,  y2025: 4500  },
  { month: 'May',  y2026: 8000,  y2025: 6000  },
  { month: 'Jun',  y2026: 7500,  y2025: 5500  },
  { month: 'Jul',  y2026: 9000,  y2025: 7000  },
  { month: 'Aug',  y2026: 8500,  y2025: 6500  },
  { month: 'Sep',  y2026: 10000, y2025: 8000  },
  { month: 'Oct',  y2026: 9500,  y2025: 7500  },
  { month: 'Nov',  y2026: 11000, y2025: 9000  },
  { month: 'Dec',  y2026: 11000, y2025: 8500  },
]

const apiExpenseData = [
  { channel: 'SMS (Twilio)',          totalUses: 8426,  costPerUse: '$0.0075', totalCost: '$63.20',  pctTotal: '49.2%', barPct: 85  },
  { channel: 'Phone Calls (Twilio)',  totalUses: 2847,  costPerUse: '$0.0075', totalCost: '$63.20',  pctTotal: '49.2%', barPct: 50  },
  { channel: 'Email (SendGrid)',      totalUses: 12453, costPerUse: '$0.0075', totalCost: '$63.20',  pctTotal: '49.2%', barPct: 35  },
  { channel: 'AI API Calls (OpenAI)', totalUses: 15676, costPerUse: '$0.0075', totalCost: '$63.20',  pctTotal: '49.2%', barPct: 65  },
  { channel: 'Channel',               totalUses: 58428, costPerUse: '',         totalCost: '$126.20', pctTotal: '100%',  barPct: 0, isTotal: true },
]

const insights = [
  'SMS is 49% of costs but has highest engagement rate (86%)',
  'Cost per lead acquired: $0.52 ($126.90 / 243 / warm)',
  'Cost per booking: $3.09 ($126.90 / 42 bookings)',
]

// ─── Human Intervention (Figma section) ───────────────────────────────

const humanInterventionByStage = [
  { stage: 'Initial Response', count: 15, pct: 15, visualCost: 103.2 },
  { stage: 'Qualification', count: 26, pct: 23, visualCost: 81.2 },
  { stage: 'Offer Presented', count: 12, pct: 10, visualCost: 51.2 },
  { stage: 'Objection Handling', count: 20, pct: 18, visualCost: 64.6 },
  { stage: 'Scheduling', count: 17, pct: 15, visualCost: 51.8 },
]

const humanInterventionBookingRate = [
  { label: 'Total Handled Diff.', value: '21 leads' },
  { label: 'Successfully Booked', value: '10 leads (48%)' },
  { label: 'Still In Progress', value: '8 leads (38%)' },
  { label: 'Lost/Dropped', value: '3 leads (14%)' },
  { label: 'Avg Time to Pickup', value: '47 min' },
  { label: 'Human Handle Time', value: '18 min' },
]

const followUpEffectiveness = [
  { contacts: '1st', sent: 60, reply: 15, rate: '25%', visualCost: 63.2 },
  { contacts: '2nd', sent: 80, reply: 19, rate: '20%', visualCost: 51.2 },
  { contacts: '3rd', sent: 75, reply: 9, rate: '10%', visualCost: 13.2 },
  { contacts: '4th', sent: 60, reply: 4, rate: '4%', visualCost: 23.2 },
  { contacts: '5th', sent: 40, reply: 3, rate: '4%', visualCost: 43.6 },
  { contacts: '6th', sent: 30, reply: 2, rate: '4%', visualCost: 31.8 },
]

const responseRateByDayOfWeek = [
  { day: 'Monday', sent: 89, reply: 19, rate: '30%', visualCost: 63.2 },
  { day: 'Tuesday', sent: 75, reply: 20, rate: '20%', visualCost: 51.2 },
  { day: 'Wednesday', sent: 68, reply: 29, rate: '10%', visualCost: 23.2 },
  { day: 'Thursday', sent: 30, reply: 9, rate: '40%', visualCost: 43.6 },
  { day: 'Friday', sent: 30, reply: 25, rate: '40%', visualCost: 103.68 },
  { day: 'Saturday', sent: 20, reply: 5, rate: '40%', visualCost: 89.68 },
  { day: 'Sunday', sent: 10, reply: 2, rate: '40%', visualCost: 9.68 },
]

const responseRateByTimeOfDay = [
  { time: '9am-12pm', sent: 89, reply: 19, rate: '30%', visualCost: 63.2 },
  { time: '12pm-3pm', sent: 75, reply: 20, rate: '20%', visualCost: 51.2 },
  { time: '3pm-6pm', sent: 68, reply: 29, rate: '10%', visualCost: 23.2 },
  { time: '6pm-9pm', sent: 30, reply: 9, rate: '40%', visualCost: 43.6 },
  { time: 'All Day', sent: 30, reply: 25, rate: '40%', visualCost: 89.68 },
]

const leadsBySourceConversion = [
  { leadSource: 'Miami Beach Studio', totalLeads: 89, bookings: 15, convRate: '30%', costPerLead: '$0', visualCost: 63.2 },
  { leadSource: 'Fort Lauderdale Studio', totalLeads: 75, bookings: 19, convRate: '20%', costPerLead: '$0', visualCost: 51.2 },
  { leadSource: 'Miami Beach Studio', totalLeads: 60, bookings: 9, convRate: '10%', costPerLead: '$12', visualCost: 23.2 },
  { leadSource: 'Fort Lauderdale Studio', totalLeads: 30, bookings: 3, convRate: '10%', costPerLead: '$83', visualCost: 43.6 },
]

const perStudioBreakdown = [
  { location: 'Miami Beach Studio', totalLeads: 89, bookings: 15, bookingRate: '30%', visualCost: 63.2 },
  { location: 'Fort Lauderdale Studio', totalLeads: 75, bookings: 19, bookingRate: '20%', visualCost: 51.2 },
  { location: 'Miami Beach Studio', totalLeads: 60, bookings: 9, bookingRate: '10%', visualCost: 23.2 },
  { location: 'Fort Lauderdale Studio', totalLeads: 30, bookings: 3, bookingRate: '10%', visualCost: 43.6 },
]

// ─── Helpers ─────────────────────────────────────────────────────────

// Use CSS variables so colors can be changed globally from globals.css
const PRIMARY = 'var(--studio-primary)'
const PRIMARY_LIGHT = 'var(--studio-primary-light)'
// Gradient color from Figma color panel
const GRADIENT_COLOR = 'var(--studio-gradient)'

function BackdropBar(props) {
  const { x, y, width, height } = props
  if (!height || height <= 0) return null
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={'#F4E9FD'}
      rx={4}
      ry={4}
    />
  )
}

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--studio-primary)',
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  )
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`bg-white border border-slate-100 shadow-sm ${className} overflow-hidden`}
      style={{ borderRadius: 20 }}
    >
      {children}
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────────────

export default function Dashboard() {
  const selectedBranchId = getEffectiveBranch()
  const selectedBranch = selectedBranchId
    ? branches.find((b) => b.id === selectedBranchId)
    : null

  // Admin users see the Admin Dashboard (Intervention Queue, To-Do, Performance); Super Admin sees org-level dashboard
  if (isAdmin()) {
    return (
      <MainLayout
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
      >
        <AdminDashboard />
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Welcome back! Here's what's happening today."
    >
      <div className="space-y-5">

        {/* Branch Context */}
        {/* {isSuperAdmin() && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#64748B' }}>Viewing data for</p>
              <p className="text-base font-semibold text-slate-900">
                {selectedBranch ? `${selectedBranch.name} Branch` : 'All Branches'}
              </p>
            </div>
          </div>
        )} */}

        {/* ── 3 Stat Cards (exact Figma) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: PRIMARY }}>TOTAL LEADS</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[46px] font-bold" style={{ color: '#050312' }}>1,248</p>
              <div className="flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp size={14} className="mr-2" />
                <span className="text-[13px]">0.8% vs last week</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: PRIMARY }}>TOTAL BOOKINGS</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[46px] font-bold" style={{ color: '#050312' }}>42</p>
              <div className="flex items-center text-sm text-emerald-600 font-medium">
                <TrendingUp size={14} className="mr-2" />
                <span className="text-[13px]">0.8% vs last week</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: PRIMARY }}>BOOKING RATE</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[46px] font-bold" style={{ color: '#050312' }}>17%</p>
              <div className="flex items-center text-sm text-rose-500 font-medium">
                <TrendingDown size={14} className="mr-2" />
                <span className="text-[13px]">0.8% vs last week</span>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Booking Rate Trend ── */}
        <Card className="p-5">
          <SectionLabel>Booking Rate Trend (Last 8 Weeks)</SectionLabel>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={bookingTrendData} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                  {/* #CE32E0 — exact gradient color from Figma, fades to transparent */}
                  <stop offset="0%"   stopColor={GRADIENT_COLOR} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={GRADIENT_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                formatter={(v) => [`${v}%`, 'Booking Rate']}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={PRIMARY}
                strokeWidth={2.5}
                fill="url(#bookingGradient)"
                dot={false}
                activeDot={{ r: 4, fill: PRIMARY }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* ── Revenue Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left col: Revenue from Intros + Human Intervention */}
          <div className="flex flex-col gap-5">
            <Card className="p-5">
              <SectionLabel>Revenue Collected from Intros</SectionLabel>
              <p className="text-[46px] font-bold mt-1" style={{ color: '#050312' }}>$2,940</p>
              <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
                42 intros × $70 each &nbsp;|&nbsp;
                <span className="text-emerald-600 font-medium">↑ 8% vs last week</span>
              </p>
            </Card>

            <Card className="p-5">
              <SectionLabel>Human Intervention Required</SectionLabel>
              <p className="text-[46px] font-bold mt-1" style={{ color: '#050312' }}>8</p>
              <button className="mt-3 flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: PRIMARY }}>
                Click to view details <ChevronRight size={12} />
              </button>
            </Card>
          </div>

          {/* Right col: AI Agent Revenue chart */}
          <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
            <div className="flex items-center justify-between gap-6">
              <div>
                <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
                  AI Agent Revenue
                </p>
                <p className="text-[14px] font-medium text-[#9CA3AF]">Year-over-year Comparison</p>
              </div>
              <p className="text-[38px] font-bold bg-gradient-to-b from-slate-500 to-[#050312] bg-clip-text text-transparent">
                $11,000
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3">
              <span className="flex items-center gap-2 text-[14px]" style={{ color: '#64748B' }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--studio-primary)' }} />
                2026
              </span>
              <span className="flex items-center gap-2 text-[14px]" style={{ color: '#64748B' }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--studio-primary-light)' }} />
                2025
              </span>
            </div>

            <div className="mt-1">
              <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={aiAgentRevenueData}
                barCategoryGap={20}
                barGap={-32}
                margin={{ top: 16, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="aiAgentBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--bar-gradient-end)" />
                    <stop offset="100%" stopColor="var(--bar-gradient-start)" />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  width={40}
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}k`)}
                  ticks={[0, 2000, 4000, 6000, 8000, 10000, 12000]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={(v) => [`$${Number(v).toLocaleString()}`]}
                />
                {/* 2025 lighter bar — slightly wider, renders first (behind) */}
                <Bar dataKey="y2025" fill="var(--studio-primary-light)" radius={[8, 8, 0, 0]} name="2025" barSize={32} />
                {/* 2026 solid bar — slightly narrower, renders on top */}
                <Bar dataKey="y2026" fill="url(#aiAgentBarGradient)" radius={[8, 8, 0, 0]} name="2026" barSize={32} />
              </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── API Expense by Channel ── */}
        <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
          <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
            API Expense by channel (This Month)
          </p>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_0.8fr_2fr] gap-6 pb-2">
                {['Channel', 'Total Uses', 'Cost/Use', 'Total Cost', '% of Total', 'Cost Visual'].map((h) => (
                  <div key={h} className="text-[14px] font-bold text-slate-900">
                    {h}
                  </div>
                ))}
              </div>

              <div className="h-px bg-slate-200/40" />

              <div className="divide-y divide-slate-200/40">
                {apiExpenseData.map((row, i) => {
                  const isTotal = !!row.isTotal
                  return (
                    <div
                      key={i}
                      className={cn(
                        'grid grid-cols-[2.2fr_1fr_1fr_1fr_0.8fr_2fr] gap-6 py-3',
                        isTotal ? 'font-semibold text-slate-900' : 'text-slate-900'
                      )}
                    >
                      <div className="text-[14px]">{row.channel}</div>
                      <div className="text-[14px]">{row.totalUses?.toLocaleString?.() ?? row.totalUses}</div>
                      <div className="text-[14px]">{row.costPerUse}</div>
                      <div className="text-[14px]">{row.totalCost}</div>
                      <div className="text-[14px]">{row.pctTotal}</div>

                      <div className="flex items-center gap-3">
                        {!isTotal ? (
                          <>
                            <div className="h-3 flex-1 rounded-full bg-slate-100">
                              <div
                                className="h-3 rounded-full"
                                style={{
                                  width: `${row.barPct}%`,
                                  background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                                }}
                              />
                            </div>
                            <span className="text-[12px] text-slate-500 whitespace-nowrap">{row.totalCost}</span>
                          </>
                        ) : (
                          <span className="text-[12px] text-slate-500 whitespace-nowrap">{row.totalCost}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Human Intervention (Figma) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Human intervention by stage */}
          <Card className="p-5 lg:col-span-2 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
            <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
              Human Intervention by Stage
            </p>

            <div className="mt-4">
              <div className="grid grid-cols-[1.4fr_0.5fr_0.4fr_1.2fr] gap-4 pb-2">
                {['Stage', 'Count', '%', 'Visual Cost'].map((h) => (
                  <div key={h} className="text-[12px] font-semibold text-[#64748B]">
                    {h}
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-200/40" />

              <div className="divide-y divide-slate-200/40">
                {humanInterventionByStage.map((row) => (
                  <div
                    key={row.stage}
                    className="grid grid-cols-[1.4fr_0.5fr_0.4fr_1.2fr] gap-4 py-3 text-[13px] text-slate-900"
                  >
                    <div className="truncate">{row.stage}</div>
                    <div>{row.count}</div>
                    <div>{row.pct}%</div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (row.visualCost / 110) * 100))}%`,
                            background: `linear-gradient(90deg, var(--bar-gradient-end) 0%, var(--bar-gradient-start) 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-[12px] text-[#64748B] whitespace-nowrap">
                        ${row.visualCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-[1.4fr_0.5fr_0.4fr_1.2fr] gap-4 py-3 text-[13px] font-semibold text-slate-900">
                  <div>Total</div>
                  <div>{humanInterventionByStage.reduce((a, r) => a + r.count, 0)}</div>
                  <div>100%</div>
                  <div className="text-[12px] text-[#64748B]">
                    ${humanInterventionByStage.reduce((a, r) => a + r.visualCost, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Right: Booking rate */}
          <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
            <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
              Human Intervention Booking Rate
            </p>

            <div className="mt-4 space-y-3">
              {humanInterventionBookingRate.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-[#64748B]">{item.label}</span>
                  <span className="text-[12px] font-semibold text-slate-900 whitespace-nowrap">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Follow-up Effectiveness (Figma) ── */}
        <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
          <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
            Follow-up Effectiveness
          </p>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 pb-2">
                {['Contacts', 'Sent', 'Reply', 'Rate', 'Visual Cost'].map((h) => (
                  <div key={h} className="text-[12px] font-semibold text-[#64748B]">
                    {h}
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-200/40" />

              <div className="divide-y divide-slate-200/40">
                {followUpEffectiveness.map((row) => (
                  <div key={row.contacts} className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] text-slate-900">
                    <div>{row.contacts}</div>
                    <div>{row.sent}</div>
                    <div>{row.reply}</div>
                    <div>{row.rate}</div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (row.visualCost / 70) * 100))}%`,
                            background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-[12px] text-[#64748B] whitespace-nowrap">${row.visualCost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] font-semibold text-slate-900">
                  <div>Total</div>
                  <div>{followUpEffectiveness.reduce((a, r) => a + r.sent, 0)}</div>
                  <div>{followUpEffectiveness.reduce((a, r) => a + r.reply, 0)}</div>
                  <div>100%</div>
                  <div className="text-[12px] text-[#64748B]">
                    ${followUpEffectiveness.reduce((a, r) => a + r.visualCost, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Response Rate by Day & Time (Figma) ── */}
        <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
          <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
            Response Rate by Day &amp; Time
          </p>

          <div className="mt-4 space-y-6">
            <div>
              <p className="text-[12px] font-semibold text-slate-900">By Day of Week:</p>

              <div className="mt-2">
                <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_2fr] gap-4 pb-2">
                  {['Day', 'Sent', 'Reply', 'Rate', 'Visual Cost'].map((h) => (
                    <div key={h} className="text-[12px] font-semibold text-[#64748B]">
                      {h}
                    </div>
                  ))}
                </div>
                <div className="h-px bg-slate-200/40" />
                <div className="divide-y divide-slate-200/40">
                  {responseRateByDayOfWeek.map((row) => (
                    <div key={row.day} className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_2fr] gap-4 py-3 text-[13px] text-slate-900">
                      <div className="truncate">{row.day}</div>
                      <div>{row.sent}</div>
                      <div>{row.reply}</div>
                      <div>{row.rate}</div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, (row.visualCost / 110) * 100))}%`,
                              background: `linear-gradient(90deg, var(--bar-gradient-end) 0%, var(--bar-gradient-start) 100%)`,
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-[#64748B] whitespace-nowrap">${row.visualCost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold text-slate-900">By Time of Day:</p>

              <div className="mt-2">
                <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_2fr] gap-4 pb-2">
                  {['Time', 'Sent', 'Reply', 'Rate', 'Visual Cost'].map((h) => (
                    <div key={h} className="text-[12px] font-semibold text-[#64748B]">
                      {h}
                    </div>
                  ))}
                </div>
                <div className="h-px bg-slate-200/40" />
                <div className="divide-y divide-slate-200/40">
                  {responseRateByTimeOfDay.map((row) => (
                    <div key={row.time} className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_2fr] gap-4 py-3 text-[13px] text-slate-900">
                      <div className="truncate">{row.time}</div>
                      <div>{row.sent}</div>
                      <div>{row.reply}</div>
                      <div>{row.rate}</div>
                      <div className="flex items-center gap-3">
                        <div className="h-3 flex-1 rounded-full bg-slate-100">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, (row.visualCost / 110) * 100))}%`,
                              background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-[#64748B] whitespace-nowrap">${row.visualCost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Leads by Source & Conversion Rate (Figma) ── */}
        <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
          <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
            Leads by Source &amp; Conversion Rate
          </p>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 pb-2">
                {['Lead Source', 'Total Leads', 'Bookings', 'Conv Rate', 'Cost/Lead', 'Visual Cost'].map((h) => (
                  <div key={h} className="text-[12px] font-semibold text-[#64748B]">
                    {h}
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-200/40" />

              <div className="divide-y divide-slate-200/40">
                {leadsBySourceConversion.map((row, idx) => (
                  <div
                    key={`${row.leadSource}-${idx}`}
                    className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] text-slate-900"
                  >
                    <div className="truncate">{row.leadSource}</div>
                    <div>{row.totalLeads}</div>
                    <div>{row.bookings}</div>
                    <div>{row.convRate}</div>
                    <div>{row.costPerLead}</div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (row.visualCost / 110) * 100))}%`,
                            background: `linear-gradient(90deg, var(--bar-gradient-end) 0%, var(--bar-gradient-start) 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-[12px] text-[#64748B] whitespace-nowrap">${row.visualCost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] font-semibold text-slate-900">
                  <div>Total</div>
                  <div>{leadsBySourceConversion.reduce((a, r) => a + r.totalLeads, 0)}</div>
                  <div>{leadsBySourceConversion.reduce((a, r) => a + r.bookings, 0)}</div>
                  <div>100%</div>
                  <div />
                  <div className="text-[12px] text-[#64748B]">
                    ${leadsBySourceConversion.reduce((a, r) => a + r.visualCost, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Per Studio Breakdown (Figma) ── */}
        <Card className="p-5 rounded-[20px] border-2 border-[#F1F5F9] shadow-[4px_4px_26px_rgba(65,65,65,0.06)]">
          <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
            Per Studio Breakdown
          </p>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_2fr] gap-6 pb-2">
                {['Location', 'Total Leads', 'Bookings', 'Booking Rate', 'Visual Cost'].map((h) => (
                  <div key={h} className="text-[12px] font-semibold text-[#64748B]">
                    {h}
                  </div>
                ))}
              </div>
              <div className="h-px bg-slate-200/40" />

              <div className="divide-y divide-slate-200/40">
                {perStudioBreakdown.map((row, idx) => (
                  <div
                    key={`${row.location}-${idx}`}
                    className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] text-slate-900"
                  >
                    <div className="truncate">{row.location}</div>
                    <div>{row.totalLeads}</div>
                    <div>{row.bookings}</div>
                    <div>{row.bookingRate}</div>
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, (row.visualCost / 110) * 100))}%`,
                            background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                          }}
                        />
                      </div>
                      <span className="text-[12px] text-[#64748B] whitespace-nowrap">${row.visualCost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] font-semibold text-slate-900">
                  <div>Total</div>
                  <div>{perStudioBreakdown.reduce((a, r) => a + r.totalLeads, 0)}</div>
                  <div>{perStudioBreakdown.reduce((a, r) => a + r.bookings, 0)}</div>
                  <div>100%</div>
                  <div className="text-[12px] text-[#64748B]">
                    ${perStudioBreakdown.reduce((a, r) => a + r.visualCost, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Gross Revenue + Net Revenue ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5">
            <SectionLabel>Gross Revenue (AI Agent Intro Bookings)</SectionLabel>
            <p className="text-[46px] font-bold mt-1" style={{ color: '#050312' }}>$2,940</p>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>42 intros × $70 each</p>
          </Card>

          <Card className="p-5">
            <SectionLabel>Net Revenue (Revenue – API Costs)</SectionLabel>
            <p className="text-[46px] font-bold mt-1" style={{ color: '#00AA34' }}>$2811.10</p>
            <p className="mt-2 text-sm" style={{ color: '#64748B' }}>
              42 intros × $70 each &nbsp;|&nbsp;
              <span className="text-emerald-600 font-medium">↑ 8% vs last week</span>
            </p>
          </Card>
        </div>

      </div>
    </MainLayout>
  )
}