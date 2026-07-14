'use client'

import MainLayout from '@/components/layout/MainLayout'
import DynamicListManagerClient from '@/components/dynamic-list/DynamicListManagerClient'

export default function DynamicListsPage() {
  return (
    <MainLayout title="Dynamic Lists" subtitle="Automatically group leads and customers by conditions">
      <DynamicListManagerClient />
    </MainLayout>
  )
}
