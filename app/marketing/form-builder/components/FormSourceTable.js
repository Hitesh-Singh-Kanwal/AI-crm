'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaginatedRows } from './analyticsTablePagination'

function rateLabel(row) {
  const views = Number(row?.views) || 0
  const submissions = Number(row?.submissions) || 0
  if (!views) return submissions ? '—' : '0%'
  const rate = Number.isFinite(Number(row?.conversionRate))
    ? Number(row.conversionRate)
    : Math.round((submissions / views) * 1000) / 10
  return `${rate.toFixed(1)}%`
}

export default function FormSourceTable({ rows, loading = false }) {
  const list = Array.isArray(rows) ? rows : []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Submissions by source</CardTitle>
        <CardDescription>
          Form views and submissions by where the visit came from — paid and organic search, social, email, referrals, and direct traffic.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <PaginatedRows rows={list}>
          {(pageRows, footer) => (
        <div className="overflow-auto rounded-md border border-border">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium text-right">Views</th>
                <th className="px-4 py-3 font-medium text-right">Submissions</th>
                <th className="px-4 py-3 font-medium text-right">Conversion rate</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {list.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    {loading
                      ? 'Loading…'
                      : 'No form views in this period. Views are grouped by source from now on, whenever someone sees one of your forms.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.source} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground">{row.label || row.source}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{Number(row.views) || 0}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {Number(row.submissions) > 0 ? Number(row.submissions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{rateLabel(row)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {footer}
        </div>
          )}
        </PaginatedRows>
      </CardContent>
    </Card>
  )
}
