'use client'

import MainLayout from '@/components/layout/MainLayout'
import OwnerDashboardPage from '@/components/owner-dashboard/full/OwnerDashboardPage'
import { hasPermission } from '@/lib/permissions'

/**
 * The dashboard is one fixed, sectioned "board meeting" page — scorecard,
 * revenue, lessons, forecast, utilization, conversions, marketing, student
 * health, priorities — rather than a per-user widget grid. Sections are still
 * permission-gated: OwnerDashboardPage drops any whose data the server
 * withholds, so a role with only Revenue sees only the revenue story.
 */
const DASHBOARD_MODULES = [
  'OwnerOverviewStudentHealth',
  'OwnerOverviewRevenue',
  'OwnerOverviewLessons',
  'OwnerOverviewFunnel',
  'OwnerOverviewMarketing',
  'goals',
]

export default function Dashboard() {
  const canSeeDashboard = DASHBOARD_MODULES.some((module) => hasPermission('dashboard', module, 'read'))

  return (
    <MainLayout title="Dashboard" subtitle="Welcome back">
      {canSeeDashboard ? (
        <OwnerDashboardPage />
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
