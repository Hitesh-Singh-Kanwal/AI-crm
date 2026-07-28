'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { OutstandingBalanceTable, OUTSTANDING_BALANCE_COLUMNS } from '@/components/reports/outstanding-balance/OutstandingBalanceTable'

export default function OutstandingBalanceReportPage() {
  return (
    <ReportPageShell
      slug="outstanding-balance"
      title="Outstanding Balance Report"
      subtitle="Students with unpaid balances"
      columns={OUTSTANDING_BALANCE_COLUMNS}
      showLeadSource={false}
      TableComponent={OutstandingBalanceTable}
      drillTitle="Balance Detail"
      summaryKeys={[{ key: 'totalOutstandingBalance', label: 'Total Outstanding' }]}
      renderDrill={(detail) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Student:</strong> {detail.studentName}</p>
          <p><strong>Original Sale Amount:</strong> {detail.originalSaleAmount}</p>
          <p><strong>Outstanding Balance:</strong> {detail.outstandingBalance}</p>
        </div>
      )}
    />
  )
}
