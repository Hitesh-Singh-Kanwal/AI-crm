'use client'

import DashboardTopCards from './DashboardTopCards'
import UrgentInterventionBanner from './UrgentInterventionBanner'
import InterventionQueueDetails from './InterventionQueueDetails'
import MyToDoList from './MyToDoList'
import MyPerformanceToday from './MyPerformanceToday'
import { useNotificationEnabled } from '@/lib/hooks/useNotificationEnabled'

/**
 * Admin Dashboard layout (Figma: Admin Dashboard - Studio CRM).
 * Top: 4 KPI cards, then urgent banner, then Intervention Queue + To-Do (70/30), then My Performance Today.
 */
export default function AdminDashboard() {
  const showUrgentBanner = useNotificationEnabled('dashboard.urgentBanner')

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopCards />

      {showUrgentBanner && <UrgentInterventionBanner />}

      {/* 70% Intervention Queue Details | 30% My To-Do List – Figma layout ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-4">
        <div className="min-h-[400px] min-w-0">
          <InterventionQueueDetails />
        </div>
        <div className="min-h-[400px] min-w-0">
          <MyToDoList />
        </div>
      </div>

      <MyPerformanceToday />
    </div>
  )
}
