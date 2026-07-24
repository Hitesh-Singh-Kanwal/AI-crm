'use client'

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
  if (!rows.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No students found for the selected filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {ACTIVE_INACTIVE_STUDENTS_COLUMNS.map((col) => (
            <TableHead key={col.key}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onRowClick(row)}>
            {ACTIVE_INACTIVE_STUDENTS_COLUMNS.map((col) => (
              <TableCell key={col.key}>{row[col.key]}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
