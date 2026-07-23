'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import WidgetHeader from './WidgetHeader'

export default function LessonsByTeacherWidget({ lessons, rangeDays, onRangeChange }) {
  const data = [...(lessons?.byTeacher || [])].sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <Card>
      <WidgetHeader title="Lessons Taught by Teacher" rangeDays={rangeDays} onRangeChange={onRangeChange} />
      {data.length > 0 ? (
        <div className="mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 px-2 text-[11px]">Teacher</TableHead>
                <TableHead className="h-9 px-2 text-right text-[11px]">Lessons Taught</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r, i) => (
                <TableRow key={r.teacher}>
                  <TableCell className={`px-2 py-2 text-[13px] font-semibold ${i === 0 ? 'text-[var(--studio-primary)]' : 'text-foreground'}`}>
                    {r.teacher}
                  </TableCell>
                  <TableCell className="px-2 py-2 text-right text-[13px] tabular-nums text-foreground">
                    {r.count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyChart message="No completed lessons in this period." />
      )}
    </Card>
  )
}
