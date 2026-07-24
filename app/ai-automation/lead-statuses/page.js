'use client'

import MainLayout from '@/components/layout/MainLayout'
import LeadStatusManagerClient from '@/components/lead-status/LeadStatusManagerClient'

export default function LeadStatusesPage() {
  return (
    <MainLayout
      title="Stages & Lifecycle"
      subtitle="Lead pipeline stages and customer Active/Inactive automations"
    >
      <LeadStatusManagerClient />
    </MainLayout>
  )
}
