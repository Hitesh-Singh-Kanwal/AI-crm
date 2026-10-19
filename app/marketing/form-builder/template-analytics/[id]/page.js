'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import MainLayout from '@/components/layout/MainLayout'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import api from '@/lib/api'
import { FORM_ANALYTICS_RANGES, formAnalyticsQuery, formAnalyticsReady, normalizeFormAnalyticsRange } from '@/lib/form-analytics'
import FormPerformanceFunnel from '../../components/FormPerformanceFunnel'
import FormSourceTable from '../../components/FormSourceTable'
import { PaginatedRows } from '../../components/analyticsTablePagination'
import { formatLeadStageLabel, useLeadStages } from '@/lib/lead-stages'
import { formatLeadSource } from '@/lib/lead-source'
import { formatDate } from '@/lib/utils'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function bucketLabel(key) {
  const [y, m, d] = String(key).split('-')
  const month = MONTHS[Number(m) - 1] || m
  return d ? `${month} ${Number(d)}` : `${month} ${y.slice(2)}`
}

function formatSource(source) {
  return formatLeadSource(source) || 'Direct / unknown'
}

function TrafficChart({ series }) {
  const max = Math.max(1, ...series.map((b) => Math.max(b.views || 0, b.submissions)))
  const labelEvery = series.length > 14 ? 5 : 1
  const barHeight = (n) => ({ height: `${(n / max) * 100}%`, minHeight: n ? 4 : 0 })
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--studio-primary)]/25" /> Views
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--studio-primary)]" /> Submissions
        </span>
      </div>
      <div className="flex h-48 items-end gap-1">
        {series.map((b, idx) => (
          <div
            key={b.key}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            title={`${bucketLabel(b.key)}: ${b.views || 0} view${b.views === 1 ? '' : 's'}, ${b.submissions} submission${b.submissions === 1 ? '' : 's'}, ${b.converted} converted`}
          >
            <div className="flex h-full w-full items-end gap-px">
              <div className="flex-1 rounded-t bg-[var(--studio-primary)]/25" style={barHeight(b.views || 0)} />
              <div className="flex-1 rounded-t bg-[var(--studio-primary)]" style={barHeight(b.submissions)} />
            </div>
            <span className="h-4 truncate text-[10px] text-muted-foreground">
              {idx % labelEvery === 0 || idx === series.length - 1 ? bucketLabel(b.key) : ''}
            </span>
          </div>
        ))}
      </div>
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
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const { stages: stageOptions } = useLeadStages()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!formAnalyticsReady({ range, from, to })) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/formBuilder/${id}/analytics?${formAnalyticsQuery({ range, from, to })}`)
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
  }, [id, range, from, to])

  useEffect(() => {
    load()
  }, [load])

  const setRange = (value) => {
    const query = formAnalyticsQuery({ range: value, from, to })
    router.replace(`/marketing/form-builder/template-analytics/${id}?${query}`)
  }
  const setCustom = (nextFrom, nextTo) => {
    const query = formAnalyticsQuery({ range: 'custom', from: nextFrom, to: nextTo })
    router.replace(`/marketing/form-builder/template-analytics/${id}?${query}`)
  }

  const totals = data?.totals
  const series = Array.isArray(data?.series) ? data.series : []
  const stages = (Array.isArray(data?.stages) ? data.stages : []).map((s) => ({ key: s.stage, count: s.count }))
  const recent = Array.isArray(data?.recent) ? data.recent : []
  const pages = Array.isArray(data?.pages) ? data.pages : []
  const traffic = totals?.traffic
  const rangeLabel = FORM_ANALYTICS_RANGES.find((r) => r.value === range)?.label || ''

  return (
    <MainLayout title={data?.form?.name || 'Form analytics'} subtitle="Views, submissions and conversions for this form">
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
        </div>

        <FormPerformanceFunnel
          loading={loading}
          visitors={formAnalyticsReady({ range, from, to }) ? traffic?.visitors : undefined}
          views={traffic?.views}
          leads={totals?.leads}
          customers={totals?.converted}
          range={range}
          from={from}
          to={to}
          spendScope={String(id || 'form')}
          onRangeChange={setRange}
          onCustomChange={setCustom}
        />

        {error ? (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : (
          <>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Views and submissions over time</CardTitle>
                <CardDescription>
                  {range === 'all' ? 'Per month, last 12 months' : `Per day, ${rangeLabel.toLowerCase()}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {series.some((b) => b.submissions > 0 || b.views > 0) ? (
                  <TrafficChart series={series} />
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No views or submissions in this period.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pages this form was viewed on</CardTitle>
                <CardDescription>Your website pages for embeds, the share link for the hosted form</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {pages.length === 0 ? (
                  <div className="py-6 text-sm text-muted-foreground">No views recorded in this period.</div>
                ) : (
                  <PaginatedRows rows={pages}>
                    {(pageRows, footer) => (
                  <div className="overflow-auto rounded-md border border-border">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-muted/40">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-4 py-3 font-medium">Page</th>
                          <th className="px-4 py-3 font-medium text-right">Views</th>
                          <th className="px-4 py-3 font-medium text-right">Visitors</th>
                          <th className="px-4 py-3 font-medium text-right">Submits</th>
                          <th className="px-4 py-3 font-medium text-right">View → submit</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card">
                        {pageRows.map((p) => (
                          <tr key={`${p.host || ''}-${p.pagePath || ''}`} className="border-t border-border">
                            <td className="px-4 py-3">
                              {p.pageUrl ? (
                                <a
                                  href={p.pageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="break-all font-mono text-xs text-foreground hover:underline"
                                >
                                  {p.pagePath || '/'}
                                </a>
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground">Unknown page</span>
                              )}
                              {p.host ? <div className="text-xs text-muted-foreground">{p.host}</div> : null}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(p.views) || 0}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(p.visitors) || 0}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(p.submits) || 0}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">
                              {Number(p.submitRate || 0).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {footer}
                  </div>
                    )}
                  </PaginatedRows>
                )}
              </CardContent>
            </Card>

            <FormSourceTable rows={data?.trafficSources} loading={loading} />

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
                <CardTitle className="text-base">Recent submissions</CardTitle>
                <CardDescription>Latest {recent.length || ''} people who filled this form</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                {recent.length === 0 ? (
                  <div className="py-6 text-sm text-muted-foreground">No submissions in this period.</div>
                ) : (
                  <PaginatedRows rows={recent}>
                    {(pageRows, footer) => (
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
                        {pageRows.map((r, idx) => (
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
                    {footer}
                  </div>
                    )}
                  </PaginatedRows>
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
