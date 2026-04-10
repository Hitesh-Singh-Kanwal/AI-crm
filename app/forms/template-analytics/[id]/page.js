import Link from 'next/link'
import { ArrowLeft, FileText, Percent } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import MainLayout from '@/components/layout/MainLayout'

function hashToUnitInterval(str) {
  const s = String(str || '')
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  // -> [0, 1)
  return ((h >>> 0) % 10000) / 10000
}

export default async function TemplateAnalyticsPage({ params }) {
  const { id } = await params

  // Dummy data (stable per form id)
  const u1 = hashToUnitInterval(id)
  const u2 = hashToUnitInterval(`${id}-submissions`)
  const views = 200 + Math.floor(u1 * 1800) // 200..1999
  const submissions = Math.max(0, Math.min(views, 5 + Math.floor(u2 * 220))) // 5..225 capped at views
  const conversionRate = views > 0 ? (submissions / views) * 100 : 0

  const makeRow = (pathSuffix, seedOffset = '') => {
    const path = `/forms/${String(id).slice(0, 8)}/${pathSuffix}`
    const v = 30 + Math.floor(hashToUnitInterval(`${id}-${pathSuffix}-${seedOffset}-views`) * 500) // 30..529
    const s = Math.min(v, Math.floor(hashToUnitInterval(`${id}-${pathSuffix}-${seedOffset}-subs`) * (v * 0.35))) // <= 35% of views
    const cr = v > 0 ? (s / v) * 100 : 0
    return { path, views: v, submissions: s, conversionRate: cr }
  }

  const urlRows = [
    makeRow('landing'),
    makeRow('register'),
    makeRow('pricing'),
    makeRow('thank-you'),
    makeRow('embed', 'alt'),
  ]

  return (
    <MainLayout title="Template Analytics" subtitle="Dummy stats (until real submissions tracking is available)">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href="/forms?view=analytics"
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
              <span className="text-sm text-slate-500 truncate">Form ID: {String(id)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Total submissions</CardTitle>
              <CardDescription>Dummy value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-slate-900 tabular-nums">{submissions}</div>
                <div className="h-10 w-10 rounded-lg bg-brand-light flex items-center justify-center">
                  <FileText className="h-5 w-5 text-brand" />
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">Based on dummy views: {views}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conversion rate</CardTitle>
              <CardDescription>Submissions ÷ views</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-slate-900 tabular-nums">{conversionRate.toFixed(1)}%</div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-slate-700" />
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">{submissions} submissions out of {views} views</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status</CardTitle>
              <CardDescription>Placeholder</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-700">
                Real submissions + conversion tracking will appear here once backend stores submission events.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Path URLs</CardTitle>
            <CardDescription>Dummy URL-wise views, submissions, and conversion rate</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="overflow-auto rounded-md border border-slate-200">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-medium">Path URL</th>
                    <th className="px-4 py-3 font-medium text-right">Views</th>
                    <th className="px-4 py-3 font-medium text-right">Total submissions</th>
                    <th className="px-4 py-3 font-medium text-right">Conversion rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {urlRows.map((r) => (
                    <tr key={r.path} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-xs text-slate-800">{r.path}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{r.views}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{r.submissions}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{r.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}

