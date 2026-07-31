'use client'

import { Fragment, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { buildReportQuery, parseReportFiltersFromSearchParams } from '@/lib/reports/reportFilters'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'
import { computeColumnTotals, hasColumnTotals, formatColumnTotal } from '@/lib/reports/reportTotals'

function formatAttendedDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function attendanceBadge(group) {
  if (group.serviceType === 'group') {
    const classes = group.sessionCount ?? 0
    const attendances = group.attendanceCount ?? 0
    return `${classes} class${classes === 1 ? '' : 'es'} · ${attendances} attendance${attendances === 1 ? '' : 's'}`
  }
  const lessons = group.attendanceCount ?? group.sessionCount ?? group.studentCount ?? 0
  return `${group.studentCount} student${group.studentCount === 1 ? '' : 's'} · ${lessons} lesson${lessons === 1 ? '' : 's'}`
}

function AttendancePanel({ groups, isLoading, error, summary }) {
  if (isLoading) {
    return <p className="px-4 py-3 text-[13px] text-muted-foreground">Loading students…</p>
  }
  if (error) {
    return <p className="px-4 py-3 text-[13px] text-destructive">{error}</p>
  }
  if (!groups?.length) {
    return <p className="px-4 py-3 text-[13px] text-muted-foreground">No attended students in this period.</p>
  }

  return (
    <div className="space-y-4 px-4 py-3">
      {summary ? (
        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
            Private <span className="font-semibold text-foreground">{summary.privateLessons ?? 0}</span>
          </span>
          <span className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
            Intro <span className="font-semibold text-foreground">{summary.introLessons ?? 0}</span>
          </span>
          <span className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
            Group classes <span className="font-semibold text-foreground">{summary.groupClasses ?? 0}</span>
          </span>
          <span className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-muted-foreground">
            Group attendances <span className="font-semibold text-foreground">{summary.groupAttendances ?? 0}</span>
            <span className="ml-1 text-[11px]">(pay basis)</span>
          </span>
        </div>
      ) : null}
      {groups.map((group) => (
        <div key={group.serviceType}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-foreground/60">
              {group.label}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {attendanceBadge(group)}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/70">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Student</th>
                  <th className="px-3 py-2 font-semibold">Lessons attended</th>
                  <th className="px-3 py-2 font-semibold">Last attended</th>
                </tr>
              </thead>
              <tbody>
                {group.students.map((student) => (
                  <tr key={student.id} className="border-t border-border/60">
                    <td className="px-3 py-2 text-foreground">{student.studentName}</td>
                    <td className="px-3 py-2 text-foreground">{student.lessonsAttended}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatAttendedDate(student.lastAttendedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TeacherExpandableReportTable({
  rows,
  columns,
  slug,
  onRowClick,
  emptyLabel = 'No teachers found for the selected filters.',
}) {
  const searchParams = useSearchParams()
  const filterQuery = searchParams?.toString() || ''
  const filters = parseReportFiltersFromSearchParams(searchParams)
  const timeZone = useReportTimezone()
  const [expandedId, setExpandedId] = useState(null)
  const [cache, setCache] = useState({})

  useEffect(() => {
    setExpandedId(null)
    setCache({})
  }, [slug, filterQuery])

  useEffect(() => {
    if (!expandedId) return undefined
    const existing = cache[expandedId]
    if (existing?.loaded || existing?.loading) return undefined

    let cancelled = false
    setCache((prev) => ({
      ...prev,
      [expandedId]: { ...(prev[expandedId] || {}), loading: true, error: null },
    }))
    const query = buildReportQuery(filters, { page: 1, pageSize: 1 })
    api.get(`/api/reports/${slug}/${encodeURIComponent(expandedId)}?${query}`).then((res) => {
      if (cancelled) return
      if (!res.success) {
        setCache((prev) => ({
          ...prev,
          [expandedId]: { loaded: true, loading: false, error: res.error || 'Failed to load students', groups: [] },
        }))
        return
      }
      setCache((prev) => ({
        ...prev,
        [expandedId]: {
          loaded: true,
          loading: false,
          error: null,
          groups: res.data?.attendanceByServiceType || [],
          summary: {
            privateLessons: res.data?.privateLessons ?? 0,
            introLessons: res.data?.introLessons ?? 0,
            groupClasses: res.data?.groupClasses ?? 0,
            groupAttendances: res.data?.groupAttendances ?? 0,
          },
        },
      }))
    })
    return () => {
      cancelled = true
    }
  }, [expandedId, filterQuery, slug])

  function toggleExpand(rowId, event) {
    event.stopPropagation()
    setExpandedId((current) => (current === rowId ? null : rowId))
  }

  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const showTotals = hasColumnTotals(columns)
  const totals = showTotals ? computeColumnTotals(rows, columns) : null

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(reportTableHeadClass, 'w-10')} />
            {columns.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const rowId = row.id
            const expanded = expandedId === rowId
            const entry = cache[rowId]
            return (
              <Fragment key={rowId}>
                <TableRow className={reportTableRowClass} onClick={() => onRowClick?.(row)}>
                  <TableCell className={reportTableCellClass}>
                    <button
                      type="button"
                      aria-label={expanded ? 'Collapse students' : 'Expand students'}
                      aria-expanded={expanded}
                      onClick={(e) => toggleExpand(rowId, e)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={reportTableCellClass}>
                      {formatReportCellValue(row[col.key], col, timeZone)}
                    </TableCell>
                  ))}
                </TableRow>
                {expanded ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length + 1} className="bg-muted/20 p-0">
                      <AttendancePanel
                        groups={entry?.groups}
                        summary={entry?.summary}
                        isLoading={Boolean(entry?.loading) || !entry?.loaded}
                        error={entry?.error}
                      />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
        {showTotals && (
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className={reportTableCellClass} />
              {columns.map((col, idx) => (
                <TableCell key={col.key} className={reportTableCellClass}>
                  {idx === 0 ? 'Page Total' : col.key in totals ? formatColumnTotal(totals[col.key]) : ''}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </ReportTableShell>
  )
}
