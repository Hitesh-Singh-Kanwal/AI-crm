'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass, reportTableCellClass } from '@/components/reports/ReportTableShell'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'
import { useReportTimezone } from '@/lib/reports/ReportTimezoneContext'

export const LEAD_CONVERSION_COLUMNS = [
  { key: 'leadName', label: 'Lead Name' },
  { key: 'leadSource', label: 'Lead Source' },
  { key: 'dateCreated', label: 'Date Created' },
  { key: 'dateBooked', label: 'Date Booked' },
  { key: 'dateOfIntro', label: 'Date of Intro' },
  { key: 'showed', label: 'Showed' },
  { key: 'sold', label: 'Sold' },
  { key: 'saleAmount', label: 'Sale Amount' },
  { key: 'teacherAssigned', label: 'Teacher Assigned' },
  { key: 'timeToConvert', label: 'Time to Convert' },
]

function formatCell(key, value, timeZone) {
  if (key === 'showed' || key === 'sold') return value ? 'Yes' : 'No'
  return formatReportCellValue(value, { key }, timeZone)
}

export function LeadConversionTable({ rows, onRowClick }) {
  const timeZone = useReportTimezone()
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No leads found for the selected filters.</p>
  }

  return (
    <ReportTableShell>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {LEAD_CONVERSION_COLUMNS.map((col) => (
              <TableHead key={col.key} className={reportTableHeadClass}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className={reportTableRowClass} onClick={() => onRowClick(row)}>
              {LEAD_CONVERSION_COLUMNS.map((col) => (
                <TableCell key={col.key} className={reportTableCellClass}>{formatCell(col.key, row[col.key], timeZone)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportTableShell>
  )
}
