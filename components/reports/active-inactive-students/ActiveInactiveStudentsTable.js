'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'

export const ACTIVE_INACTIVE_STUDENTS_COLUMNS = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'studioName', label: 'Studio' },
  { key: 'status', label: 'Status' },
  { key: 'lastLessonDate', label: 'Last Lesson Date' },
  { key: 'nextLessonDate', label: 'Next Lesson Date' },
  { key: 'lessonsTaken', label: 'Lessons Taken' },
  { key: 'lessonsRemaining', label: 'Lessons Remaining' },
  { key: 'totalSpend', label: 'Total Spend' },
  { key: 'programType', label: 'Program Type' },
]

export function ActiveInactiveStudentsTable({ rows, onRowClick }) {
  const timeZone = useReportTimezone()
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No students found for the selected filters.</p>
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {ACTIVE_INACTIVE_STUDENTS_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {ACTIVE_INACTIVE_STUDENTS_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>{formatReportCellValue(row[col.key], col, timeZone)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
