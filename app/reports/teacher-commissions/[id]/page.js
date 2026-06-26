'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import MainLayout from '@/components/layout/MainLayout'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { getInitials, formatCurrency, formatDate } from '@/lib/utils'
import { loadTeacherSales, summarizeTeacher, monthlyTrend } from '@/lib/teacherCommissions'

export default function TeacherCommissionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadTeacherSales().then(({ teachers, sales }) => {
      if (cancelled) return
      const teacher = teachers.find((t) => t.id === String(id))
      const teacherSales = sales.filter((s) => s.teacherID === String(id))
      setData({
        teacher: teacher ?? { id: String(id), name: teacherSales[0]?.teacherName || 'Teacher' },
        sales: teacherSales,
      })
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [id])

  const summary = useMemo(() => (data ? summarizeTeacher(data.sales) : null), [data])
  const trend = useMemo(() => (data ? monthlyTrend(data.sales) : []), [data])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center"><LoadingSpinner /></div>
      </MainLayout>
    )
  }

  const { teacher, sales } = data

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-[13px] font-semibold text-primary">
                {getInitials(teacher.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{teacher.name}</h1>
              <p className="text-[13px] text-muted-foreground">Commission & sales report</p>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Packages Sold" value={summary.packagesSold} />
          <Stat label="This Month" value={summary.soldThisMonth} />
          <Stat label="Last Month" value={summary.soldLastMonth} />
          <Stat label="Total Revenue" value={formatCurrency(summary.revenue)} />
        </section>

        <section className="rounded-[20px] border-2 border-border bg-card p-5 shadow-sm">
          <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
            Packages Sold Over Time
          </h3>
          <div className="mt-4 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="teacherTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--side-gradient-end)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--side-gradient-end)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={rechartsTooltipContentStyle}
                  formatter={(value, name) =>
                    name === 'revenue' ? [formatCurrency(value), 'Revenue'] : [value, 'Packages']
                  }
                />
                <Area type="monotone" dataKey="count" stroke="var(--side-gradient-end)" strokeWidth={2} fill="url(#teacherTrendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-2.5 text-[12px] font-semibold text-muted-foreground">
            Recent Sales
          </div>
          {sales.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground">No package sales recorded.</div>
          ) : (
            sales.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 border-b border-border px-5 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">{s.packageName}</p>
                  <p className="text-[11px] text-muted-foreground">{s.customerName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-semibold text-foreground">{formatCurrency(s.value)}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDate(s.date)}</p>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </MainLayout>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[22px] font-bold text-foreground">{value}</p>
    </div>
  )
}
