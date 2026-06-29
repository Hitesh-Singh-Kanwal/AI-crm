'use client'

import MainLayout from '@/components/layout/MainLayout'
import WorkflowBuilderClient from '@/components/workflow/builder/WorkflowBuilderClient'

export default function WorkflowBuilderPage() {
  return (
    <MainLayout
      title="Workflow Builder"
      subtitle="Build and manage automations"
      mainClassName="overflow-hidden !p-2 sm:!p-3"
    >
      <WorkflowBuilderClient />
    </MainLayout>
  )
}
