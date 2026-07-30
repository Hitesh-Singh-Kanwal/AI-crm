'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'
import { cn } from '@/lib/utils'

export const GROUP_ATTENDANCE_COLUMNS = [
  { key: 'className', label: 'Class Name' },
  { key: 'classDate', label: 'Class Date', dateStyle: 'datetime' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'attended', label: 'Attended' },
]

function StudentsPanel({ students }) {
  if (!students?.length) {
    return (
      <p className="px-4 py-3 text-[13px] text-muted-foreground">
        No students booked on this class.
      </p>
    )
  }

  return (
    <div className="px-4 py-3">
      <div className="overflow-hidden rounded-lg border border-border/70">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">Attended</th>
              <th className="px-3 py-2">Payment Source</th>
              <th className="px-3 py-2">Payment Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-t border-border/60">
                <td className="px-3 py-2 text-foreground">{student.studentName}</td>
                <td className="px-3 py-2 text-foreground">{student.attended ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2 text-muted-foreground">{student.paymentSource || '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{student.paymentStatus || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function GroupAttendanceTable({ rows, onRowClick }) {
  const [expandedId, setExpandedId] = useState(null)
  const timeZone = useReportTimezone()

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No group class attendance found for the selected filters.
      </p>
    )
  }

  function toggleExpand(rowId, event) {
    event.stopPropagation()
    setExpandedId((current) => (current === rowId ? null : rowId))
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={cn(reportTableHeadClass, 'w-10')} />
            {GROUP_ATTENDANCE_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const expanded = expandedId === row.id
            return (
              <Fragment key={row.id}>
                <TableRow className={reportTableRowClass} onClick={() => onRowClick?.(row)}>
                  <TableCell className={reportTableCellClass}>
                    <button
                      type="button"
                      aria-label={expanded ? 'Collapse students' : 'Expand students'}
                      aria-expanded={expanded}
                      onClick={(e) => toggleExpand(row.id, e)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </TableCell>
                  {GROUP_ATTENDANCE_COLUMNS.map((col) => (
                    <TableCell key={col.key} className={reportTableCellClass}>
                      {col.key === 'attended'
                        ? row.attended ?? 0
                        : formatReportCellValue(row[col.key], col, timeZone)}
                    </TableCell>
                  ))}
                </TableRow>
                {expanded ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={GROUP_ATTENDANCE_COLUMNS.length + 1} className="bg-muted/20 p-0">
                      <StudentsPanel students={row.students} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
