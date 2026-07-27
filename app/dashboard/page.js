'use client'

import { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder'
import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { dashboardWidgetRegistry } from '@/components/dashboard/widgets/registry'
import { ownerDashboardWidgetRegistry } from '@/components/owner-dashboard/widgets/registry'
import { isAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { useDashboardOverview, useOwnerDashboardOverview } from '@/lib/hooks/useAnalyticsOverview'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  const admin = isAdmin()

  // Each widget (owner-overview or regular) has its own permission (see
  // PERMISSION in the two registry.js files) — there's no single blanket
  // dashboard permission anymore. Non-admins see owner-overview and regular
  // widgets side by side in one grid, one Customize control, one date-range
  // picker — to a non-admin viewer these are all just "the dashboard", not
  // two separate sections. Admins keep the fixed AdminDashboard as their main
  // view below the owner-overview widgets, so their builder only carries the
  // owner-overview set.
  const visibleOwnerWidgets = ownerDashboardWidgetRegistry.filter(
    (w) => !w.permission || hasPermission(w.permission.category, w.permission.module, 'read')
  )
  const visibleRegularWidgets = dashboardWidgetRegistry.filter(
    (w) => !w.permission || hasPermission(w.permission.category, w.permission.module, 'read')
  )
  const canSeeOwnerOverview = visibleOwnerWidgets.length > 0

  const visibleWidgets = admin ? visibleOwnerWidgets : [...visibleOwnerWidgets, ...visibleRegularWidgets]
  const canSeeDashboard = visibleWidgets.length > 0

  const [range, setRange] = useState(30)
  const { data: overview, error, isLoading, isValidating, mutate } = useDashboardOverview(range, {
    enabled: !admin && canSeeDashboard,
  })

  // Owner-overview widgets each manage their own date range (see withOwnRange
  // in components/owner-dashboard/widgets/registry.js), seeded from `range`
  // below as their shared default — changing the top picker updates every
  // widget still on that default, while any widget the user has switched
  // individually keeps its own override. This call also warms the SWR cache
  // for that default range before the grid mounts, so widgets don't each show
  // their own loading skeleton on first paint (which was flashing right after
  // DashboardBuilder's own layout skeleton — a double-skeleton "blink").
  const { isLoading: ownerWarmingUp } = useOwnerDashboardOverview(range, { enabled: canSeeOwnerOverview })

  if (admin) {
    return (
      <MainLayout title="Dashboard" subtitle="Welcome back! Here's what's happening today.">
        {canSeeOwnerOverview && (
          <div className="animate-fade-in mb-10">
            <DashboardBuilder
              page="owner-dashboard"
              widgets={visibleWidgets}
              sharedProps={{ defaultRange: range }}
              dataLoading={ownerWarmingUp}
              toolbarExtra={<DateRangePresets value={range} onChange={setRange} />}
            />
          </div>
        )}
        <AdminDashboard />
      </MainLayout>
    )
  }

  const dataLoading = (isLoading && !overview) || ownerWarmingUp

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

      {canSeeDashboard ? (
        <DashboardBuilder
          page="dashboard"
          widgets={visibleWidgets}
          sharedProps={{ ...(overview || {}), defaultRange: range }}
          dataLoading={dataLoading}
          toolbarExtra={
            <div className="flex items-center gap-2">
              {isValidating && overview && (
                <span className="text-[11px] text-muted-foreground">Updating…</span>
              )}
              <DateRangePresets value={range} onChange={setRange} />
            </div>
          }
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">Nothing to show yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an admin to grant you a dashboard permission in Settings → Roles.
          </p>
        </div>
      )}
    </MainLayout>
  )
}
