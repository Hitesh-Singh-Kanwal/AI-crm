'use client'

import { useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import DynamicListMembersClient from '@/components/dynamic-list/DynamicListMembersClient'

export default function DynamicListMembersPage() {
  const params = useParams()
  const id = String(params?.id || '')

  return (
    <MainLayout title="List Members" subtitle="View leads in this dynamic list">
      <DynamicListMembersClient listId={id} />
    </MainLayout>
  )
}
