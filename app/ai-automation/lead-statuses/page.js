'use client'

import MainLayout from '@/components/layout/MainLayout'
import LeadStatusManagerClient from '@/components/lead-status/LeadStatusManagerClient'

export default function LeadStatusesPage() {
  return (
    <MainLayout
      title="Lead Statuses"
      subtitle="Customize lead statuses and automations (simple rules + tier ladders)"
    >
      <LeadStatusManagerClient />
    </MainLayout>
  )
}
