'use client'

import { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder'
import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { dashboardWidgetRegistry } from '@/components/dashboard/widgets/registry'
import { isAdmin } from '@/lib/auth'
import { useDashboardOverview } from '@/lib/hooks/useAnalyticsOverview'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const admin = isAdmin()
  const [rangeDays, setRangeDays] = useState(30)
  const { data: overview, error, isLoading, isValidating, mutate } = useDashboardOverview(rangeDays, {
    enabled: !admin,
  })

  if (admin) {
    return (
      <MainLayout title="Dashboard" subtitle="Welcome back! Here's what's happening today.">
        <AdminDashboard />
      </MainLayout>
    )
  }

  const dataLoading = isLoading && !overview

  return (
    <MainLayout title="Dashboard" subtitle="Track performance and gain insights">
      {error && !overview && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Couldn’t load dashboard data.{' '}
            <span className="text-muted-foreground">{error.message || 'Please try again.'}</span>
          </p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()}>
            Retry
          </Button>
        </div>
      )}

      <DashboardBuilder
        page="dashboard"
        widgets={dashboardWidgetRegistry}
        sharedProps={overview || {}}
        dataLoading={dataLoading}
        toolbarExtra={
          <div className="flex items-center gap-2">
            {isValidating && overview && (
              <span className="text-[11px] text-muted-foreground">Updating…</span>
            )}
            <DateRangePresets value={rangeDays} onChange={setRangeDays} />
          </div>
        }
      />
    </MainLayout>
  )
}
