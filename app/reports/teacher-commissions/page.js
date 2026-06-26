'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { getInitials, formatCurrency, formatDate } from '@/lib/utils'
import { loadTeacherSales, summarizeTeacher } from '@/lib/teacherCommissions'

export default function TeacherCommissionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    loadTeacherSales().then(({ teachers, sales }) => {
      if (cancelled) return
      const byTeacher = new Map(teachers.map((t) => [t.id, []]))
      for (const sale of sales) {
        if (!byTeacher.has(sale.teacherID)) byTeacher.set(sale.teacherID, [])
        byTeacher.get(sale.teacherID).push(sale)
      }
      const merged = teachers.map((t) => ({
        ...t,
        ...summarizeTeacher(byTeacher.get(t.id) ?? []),
      }))
      merged.sort((a, b) => b.packagesSold - a.packagesSold || b.revenue - a.revenue)
      setRows(merged)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, search])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          packages: acc.packages + r.packagesSold,
          revenue: acc.revenue + r.revenue,
          thisMonth: acc.thisMonth + r.soldThisMonth,
        }),
        { packages: 0, revenue: 0, thisMonth: 0 },
      ),
    [rows],
  )

  return (
    <MainLayout title="Teacher's Commissions" subtitle="Packages sold and revenue attributed to each teacher">
      <div className="space-y-6 py-2">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Packages Sold" value={totals.packages} />
          <SummaryCard label="Sold This Month" value={totals.thisMonth} />
          <SummaryCard label="Total Revenue" value={formatCurrency(totals.revenue)} />
        </section>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teachers…"
            className="pl-9 h-9 text-[13px]"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.4fr_auto] items-center gap-3 border-b border-border bg-muted/40 px-5 py-2.5 text-[12px] font-semibold text-muted-foreground">
            <span>Teacher</span>
            <span className="text-right">Sold</span>
            <span className="text-right">This Mo.</span>
            <span className="text-right">Last Mo.</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Last Sale</span>
            <span />
          </div>

          {loading ? (
            <div className="py-16 text-center"><LoadingSpinner /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-muted-foreground">No teachers found.</div>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => router.push(`/reports/teacher-commissions/${r.id}`)}
                className="grid w-full grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.4fr_auto] items-center gap-3 border-b border-border px-5 py-3 text-left transition-colors last:border-0 hover:bg-muted/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                      {getInitials(r.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-[13px] font-medium text-foreground">{r.name}</span>
                </div>
                <span className="text-right text-[13px] font-semibold text-foreground">{r.packagesSold}</span>
                <span className="text-right text-[13px] text-foreground">{r.soldThisMonth}</span>
                <span className="text-right text-[13px] text-muted-foreground">{r.soldLastMonth}</span>
                <span className="text-right text-[13px] font-medium text-foreground">{formatCurrency(r.revenue)}</span>
                <span className="text-right text-[12px] text-muted-foreground">
                  {r.lastSaleDate ? (
                    <>
                      {formatDate(r.lastSaleDate)}
                      <span className="block text-[11px] text-foreground/70">{formatCurrency(r.lastSaleValue)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-[20px] border-2 border-border bg-card p-5 text-card-foreground shadow-sm">
      <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">{label}</p>
      <h3 className="mt-1 text-[34px] font-bold leading-[1.21] text-foreground">{value}</h3>
    </div>
  )
}
