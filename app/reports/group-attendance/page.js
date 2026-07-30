'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { GroupAttendanceTable, GROUP_ATTENDANCE_COLUMNS } from '@/components/reports/group-attendance/GroupAttendanceTable'
import { formatReportCellValue } from '@/lib/reports/formatReportCell'

export default function GroupAttendanceReportPage() {
  return (
    <ReportPageShell
      slug="group-attendance"
      title="Group Attendance Report"
      subtitle="Attendance by group class — expand a row to see who attended"
      columns={GROUP_ATTENDANCE_COLUMNS}
      showLeadSource={false}
      TableComponent={GroupAttendanceTable}
      drillTitle="Class Detail"
      summaryKeys={[{ key: 'attendanceRatePct', label: 'Attendance Rate' }]}
      renderDrill={(detail, timeZone) => (
        <div className="space-y-3 p-4 text-sm">
          <p>
            <strong>Class:</strong> {detail.className}
          </p>
          <p>
            <strong>Date:</strong>{' '}
            {formatReportCellValue(detail.classDate, { dateStyle: 'datetime' }, timeZone)}
          </p>
          <p>
            <strong>Teacher:</strong> {detail.teacherName}
          </p>
          <p>
            <strong>Attended:</strong> {detail.attended ?? 0}
            {detail.studentCount != null ? ` of ${detail.studentCount}` : ''}
          </p>
          {Array.isArray(detail.students) && detail.students.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="font-semibold">Students</p>
              <ul className="list-disc space-y-1 pl-5">
                {detail.students.map((student) => (
                  <li key={student.id}>
                    {student.studentName} · {student.attended ? 'Attended' : 'Absent'}
                    {student.paymentSource ? ` · ${student.paymentSource}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    />
  )
}
