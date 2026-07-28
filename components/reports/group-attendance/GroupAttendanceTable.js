'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'

export const GROUP_ATTENDANCE_COLUMNS = [
  { key: 'className', label: 'Class Name' },
  { key: 'classDate', label: 'Class Date' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'studentName', label: 'Student Name' },
  { key: 'attended', label: 'Attended' },
  { key: 'paymentSource', label: 'Payment Source' },
  { key: 'paymentStatus', label: 'Payment Status' },
]

function formatCell(key, value) {
  if (key === 'attended') return value ? 'Yes' : 'No'
  return value
}

export function GroupAttendanceTable({ rows, onRowClick }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No group class attendance found for the selected filters.</p>
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {GROUP_ATTENDANCE_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {GROUP_ATTENDANCE_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>{formatCell(col.key, row[col.key])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
