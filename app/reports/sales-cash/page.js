'use client'

import ReportPageShell from '@/components/reports/ReportPageShell'
import { SalesCashTable, SALES_CASH_COLUMNS } from '@/components/reports/sales-cash/SalesCashTable'

export default function SalesCashReportPage() {
  return (
    <ReportPageShell
      slug="sales-cash"
      title="Sales and Cash Report"
      subtitle="New sales, payments, tips, and refunds"
      columns={SALES_CASH_COLUMNS}
      showLeadSource={false}
      TableComponent={SalesCashTable}
      drillTitle="Transaction Detail"
      summaryKeys={[
        { key: 'totalSaleAmount', label: 'Total Sales' },
        { key: 'totalCashCollected', label: 'Total Cash Collected' },
      ]}
      renderDrill={(detail) => (
        <div className="space-y-2 p-4 text-sm">
          <p><strong>Type:</strong> {detail.transactionType}</p>
          <p><strong>Student:</strong> {detail.studentName}</p>
          <p><strong>Teacher:</strong> {detail.teacherName}</p>
          <p><strong>Program:</strong> {detail.programName}</p>
          <p><strong>Sale Amount:</strong> {detail.saleAmount}</p>
          <p><strong>Cash Collected:</strong> {detail.cashCollected}</p>
        </div>
      )}
    />
  )
}
