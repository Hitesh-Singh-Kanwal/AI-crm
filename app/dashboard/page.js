'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder'
import { dashboardWidgetRegistry } from '@/components/dashboard/widgets/registry'
import { isAdmin } from '@/lib/auth'
import api from '@/lib/api'

export default function Dashboard() {
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    if (isAdmin()) return
    let active = true
    api.get('/api/dashboard/overview').then((res) => {
      if (active && res.success) setOverview(res.data)
    })
    return () => { active = false }
  }, [])

  // Admin users see the Admin Dashboard (Intervention Queue, To-Do, Performance); Super Admin sees the customizable org-level dashboard
  if (isAdmin()) {
    return (
      <MainLayout
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening today."
      >
        <AdminDashboard />
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title="Dashboard"
      subtitle="Welcome back! Here's what's happening today."
    >
      <DashboardBuilder page="dashboard" widgets={dashboardWidgetRegistry} sharedProps={overview || {}} />
    </MainLayout>
  )
}
