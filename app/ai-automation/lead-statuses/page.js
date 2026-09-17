'use client'

import MainLayout from '@/components/layout/MainLayout'
import LeadStatusManagerClient from '@/components/lead-status/LeadStatusManagerClient'

export default function LeadStatusesPage() {
  return (
    <MainLayout
      title="Stages & Lifecycle"
      subtitle="Organization-wide lead stages, customer statuses, and the automations that move people between them"
    >
      <LeadStatusManagerClient />
    </MainLayout>
  )
}
