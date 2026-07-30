'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'

export const REVENUE_BY_TEACHER_COLUMNS = [
  { key: 'entityName', label: 'Name' },
  { key: 'totalLessons', label: 'Total Lessons' },
  { key: 'activeStudents', label: 'Active Students' },
  { key: 'revenueGenerated', label: 'Revenue Generated' },
  { key: 'introConversions', label: 'Intro Conversions' },
  { key: 'programUpgrades', label: 'Program Upgrades' },
  { key: 'retentionPct', label: 'Retention %' },
  { key: 'avgLessonsPerStudent', label: 'Avg Lessons per Student' },
]

export function RevenueByTeacherTable({ rows, onRowClick }) {
  const timeZone = useReportTimezone()
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No revenue data found for the selected filters.</p>
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {REVENUE_BY_TEACHER_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {REVENUE_BY_TEACHER_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>{formatReportCellValue(row[col.key], col, timeZone)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
