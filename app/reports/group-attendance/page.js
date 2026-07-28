'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { GroupAttendanceTable, GROUP_ATTENDANCE_COLUMNS } from '@/components/reports/group-attendance/GroupAttendanceTable'

export default function GroupAttendanceReportPage() {
  return (
    <ReportPageShell
      slug="group-attendance"
      title="Group Attendance Report"
      subtitle="Per-student attendance for group classes"
      columns={GROUP_ATTENDANCE_COLUMNS}
      showLeadSource={false}
      TableComponent={GroupAttendanceTable}
      drillTitle="Attendance Detail"
      summaryKeys={[{ key: 'attendanceRatePct', label: 'Attendance Rate' }]}
      renderDrill={(detail) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Class:</strong> {detail.className}</p>
          <p><strong>Student:</strong> {detail.studentName}</p>
          <p><strong>Attended:</strong> {detail.attended ? 'Yes' : 'No'}</p>
        </div>
      )}
    />
  )
}
