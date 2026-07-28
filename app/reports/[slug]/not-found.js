'use client'

import Link from 'next/link'
import MainLayout from '@/components/layout/MainLayout'

export default function ReportNotFound() {
  return (
    <MainLayout title="Report not found" subtitle="That report is not in the catalog">
      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          The report you requested does not exist or is not available.
        </p>
        <Link
          href="/reports"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Back to All Reports
        </Link>
      </div>
    </MainLayout>
  )
}
