'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { PaymentPlanTable, PAYMENT_PLAN_COLUMNS } from '@/components/reports/payment-plan/PaymentPlanTable'

export default function PaymentPlanReportPage() {
  return (
    <ReportPageShell
      slug="payment-plan"
      title="Payment Plan Report"
      subtitle="Active installment plans and due dates"
      columns={PAYMENT_PLAN_COLUMNS}
      showLeadSource={false}
      TableComponent={PaymentPlanTable}
      drillTitle="Payment Plan Detail"
      summaryKeys={[{ key: 'upcomingDueCount', label: 'Plans with Upcoming Due Dates' }]}
      renderDrill={(detail) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Student:</strong> {detail.studentName}</p>
          <p><strong>Plan Total:</strong> {detail.planTotal}</p>
          <p><strong>Installments Remaining:</strong> {detail.installmentsRemaining}</p>
        </div>
      )}
    />
  )
}
