'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, BarChart3, FileText, UserCheck, Users } from 'lucide-react'

import MainLayout from '@/components/layout/MainLayout'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'
import { FORM_ANALYTICS_RANGES, normalizeFormAnalyticsRange } from '@/lib/form-analytics'
import { formatLeadStageLabel, useLeadStages } from '@/lib/lead-stages'
import { cn, formatDate } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function bucketLabel(key) {
  const [y, m, d] = String(key).split('-')
  const month = MONTHS[Number(m) - 1] || m
  return d ? `${month} ${Number(d)}` : `${month} ${y.slice(2)}`
}

function formatSource(source) {
  if (!source || source === 'direct') return 'Direct / unknown'
  return String(source).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatCard({ label, value, hint, icon: Icon, iconWrap, iconClass }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <h3 className="text-3xl font-bold text-foreground tabular-nums">{value}</h3>
            {hint ? <p className="text-xs text-muted-foreground mt-2">{hint}</p> : null}
          </div>
          <div className={cn('h-12 w-12 rounded-lg flex items-center justify-center', iconWrap)}>
            <Icon className={cn('h-6 w-6', iconClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SubmissionsChart({ series }) {
  const max = Math.max(1, ...series.map((b) => b.submissions))
  const labelEvery = series.length > 14 ? 5 : 1
  return (
    <div className="flex h-48 items-end gap-1">
      {series.map((b, idx) => (
        <div key={b.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t bg-[var(--studio-primary)]/80 transition-all hover:bg-[var(--studio-primary)]"
            style={{ height: `${(b.submissions / max) * 100}%`, minHeight: b.submissions ? 4 : 0 }}
            title={`${bucketLabel(b.key)}: ${b.submissions} submission${b.submissions === 1 ? '' : 's'}, ${b.converted} converted`}
          />
          <span className="h-4 truncate text-[10px] text-muted-foreground">
            {idx % labelEvery === 0 || idx === series.length - 1 ? bucketLabel(b.key) : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function BreakdownList({ items, total, getLabel, emptyText }) {
  if (!items.length) return <div className="py-6 text-sm text-muted-foreground">{emptyText}</div>
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const pct = total ? Math.round((it.count / total) * 100) : 0
        return (
          <div key={it.key} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-foreground">{getLabel(it.key)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {it.count} · {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--studio-primary)]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FormAnalyticsContent() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const range = normalizeFormAnalyticsRange(searchParams.get('range'))
  const { stages: stageOptions } = useLeadStages()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/formBuilder/${id}/analytics?range=${encodeURIComponent(range)}`)
      if (result.success && result.data) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to load form analytics')
      }
    } catch {
      setError('Failed to load form analytics')
    } finally {
      setLoading(false)
    }
  }, [id, range])

  useEffect(() => {
    load()
  }, [load])

  const setRange = (value) => router.replace(`/marketing/form-builder/template-analytics/${id}?range=${value}`)

  const totals = data?.totals
  const series = Array.isArray(data?.series) ? data.series : []
  const stages = (Array.isArray(data?.stages) ? data.stages : []).map((s) => ({ key: s.stage, count: s.count }))
  const sources = (Array.isArray(data?.sources) ? data.sources : []).map((s) => ({ key: s.source, count: s.count }))
  const recent = Array.isArray(data?.recent) ? data.recent : []
  const rangeLabel = FORM_ANALYTICS_RANGES.find((r) => r.value === range)?.label || ''

  return (
    <MainLayout title={data?.form?.name || 'Form analytics'} subtitle="Submissions and conversions for this form">
      <div className="space-y-6 relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]">
            <GlobalLoader text="Loading form analytics…" />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/marketing/form-builder?view=analytics"
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/40"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-foreground">{data?.form?.name || 'Form'}</h2>
                {data?.form?.isDeleted ? <Badge variant="secondary">No longer available</Badge> : null}
                {data?.form?.status ? (
                  <Badge variant="outline" className="capitalize">
                    {data.form.status}
                  </Badge>
                ) : null}
              </div>
              {data?.form?.url ? (
                <p className="truncate text-xs text-muted-foreground">{data.form.url}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {FORM_ANALYTICS_RANGES.map((r) => (
              <Button
                key={r.value}
                size="sm"
                variant={range === r.value ? 'default' : 'outline'}
                onClick={() => setRange(r.value)}
                disabled={loading}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total submissions"
                value={totals ? totals.submissions : '—'}
                hint="Includes repeat submissions"
                icon={FileText}
                iconWrap="bg-brand-light"
                iconClass="text-brand"
              />
              <StatCard
                label="People who filled"
                value={totals ? totals.leads : '—'}
                hint="Unique leads"
                icon={Users}
                iconWrap="bg-blue-100"
                iconClass="text-blue-600"
              />
              <StatCard
                label="Converted to customer"
                value={totals ? totals.converted : '—'}
                hint="Leads now customers"
                icon={UserCheck}
                iconWrap="bg-green-100"
                iconClass="text-green-600"
              />
              <StatCard
                label="Conversion rate"
                value={totals ? `${Number(totals.conversionRate || 0).toFixed(1)}%` : '—'}
                hint={
                  totals?.lastSubmissionAt
                    ? `Last submission ${formatDate(totals.lastSubmissionAt)}`
                    : 'Converted ÷ people who filled'
                }
                icon={BarChart3}
                iconWrap="bg-purple-100"
                iconClass="text-purple-600"
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Submissions over time</CardTitle>
                <CardDescription>
                  {range === 'all' ? 'Per month, last 12 months' : `Per day, ${rangeLabel.toLowerCase()}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {series.some((b) => b.submissions > 0) ? (
                  <SubmissionsChart series={series} />
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No submissions in this period.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Where these leads are now</CardTitle>
                  <CardDescription>Current lead stage of people who filled this form</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <BreakdownList
                    items={stages}
                    total={totals?.leads || 0}
                    getLabel={(key) => formatLeadStageLabel(key, stageOptions) || 'Unknown'}
                    emptyText="No leads in this period."
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Traffic sources</CardTitle>
                  <CardDescription>UTM source recorded on each submission</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <BreakdownList
                    items={sources}
                    total={totals?.submissions || 0}
                    getLabel={formatSource}
                    emptyText="No submissions in this period."
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent submissions</CardTitle>
                <CardDescription>Latest {recent.length || ''} people who filled this form</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {recent.length === 0 ? (
                  <div className="py-6 text-sm text-muted-foreground">No submissions in this period.</div>
                ) : (
                  <div className="overflow-auto rounded-md border border-border">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Contact</th>
                          <th className="px-4 py-3 font-medium">Source</th>
                          <th className="px-4 py-3 font-medium">Stage</th>
                          <th className="px-4 py-3 font-medium">Customer</th>
                          <th className="px-4 py-3 font-medium">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card">
                        {recent.map((r, idx) => (
                          <tr key={`${r.leadID}-${idx}`} className="border-t border-border">
                            <td className="px-4 py-3 font-medium text-foreground">{r.name || '—'}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <div>{r.phoneNumber || '—'}</div>
                              {r.email ? <div className="text-xs">{r.email}</div> : null}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{formatSource(r.source)}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatLeadStageLabel(r.stage, stageOptions) || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {r.converted ? (
                                <Badge variant="success">Converted</Badge>
                              ) : (
                                <span className="text-muted-foreground">Not yet</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.submittedAt ? formatDate(r.submittedAt) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  )
}

export default function TemplateAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <FormAnalyticsContent />
    </Suspense>
  )
}
