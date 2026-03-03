'use client'

import { Users, UserPlus, DollarSign, TrendingUp, TrendingDown, Lightbulb, ChevronRight } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import { dashboardStats } from '@/data/dummyData'
import { getEffectiveBranch, isSuperAdmin, isAdmin } from '@/lib/auth'
import { branches } from '@/data/dummyData'
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
        color: '#9224EF',
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
          <Card className="p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <SectionLabel>AI Agent Revenue</SectionLabel>
                <p className="text-xs" style={{ color: '#64748B' }}>Year-over-year Comparison</p>
              </div>
              <p className="text-[38px] font-bold" style={{ color: '#050312' }}>$11,000</p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#64748B' }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PRIMARY }} />
                2026
              </span>
              <span className="flex items-center gap-1.5 text-[11px]" style={{ color: '#64748B' }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PRIMARY_LIGHT }} />
                2025
              </span>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={aiAgentRevenueData}
                barCategoryGap="20%"
                barGap={-22}
                margin={{ top: 0, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                  ticks={[0, 3000, 6000, 9000, 12000]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={(v) => [`$${Number(v).toLocaleString()}`]}
                />
                {/* 2025 lighter bar — slightly wider, renders first (behind) */}
                <Bar dataKey="y2025" shape={<BackdropBar />} name="2025" barSize={26} />
                {/* 2026 solid bar — slightly narrower, renders on top */}
                <Bar dataKey="y2026" fill={PRIMARY} radius={[4, 4, 0, 0]} name="2026" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* ── API Expense by Channel ── */}
        <Card className="p-5">
          <SectionLabel>API Expense by Channel (This Month)</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Channel', 'Total Uses', 'Cost/Use', 'Total Cost', '% of Total', 'Cost Visual'].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-slate-400 pb-2 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiExpenseData.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-50 last:border-0 ${row.isTotal ? 'font-semibold text-slate-700' : 'text-slate-600'}`}
                  >
                    <td className="py-2.5 pr-4 text-[13px] whitespace-nowrap">{row.channel}</td>
                    <td className="py-2.5 pr-4 text-[13px]">{row.totalUses.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-[13px]">{row.costPerUse}</td>
                    <td className="py-2.5 pr-4 text-[13px]">{row.totalCost}</td>
                    <td className="py-2.5 pr-4 text-[13px]">{row.pctTotal}</td>
                    <td className="py-2.5 w-48">
                      {!row.isTotal && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div
                              style={{
                                width: `${row.barPct}%`,
                                background: PRIMARY_LIGHT,
                                height: '0.375rem',
                                borderRadius: '9999px',
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">{row.totalCost}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Insights */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-2 text-[11px]" style={{ color: '#64748B' }}>
              <Lightbulb size={13} className="mt-0.5 shrink-0" style={{ color: PRIMARY }} />
              <span className="font-semibold text-slate-600 mr-1">Insights:</span>
              {insights.map((ins, i) => (
                <span key={i} className="mr-4">• {ins}</span>
              ))}
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