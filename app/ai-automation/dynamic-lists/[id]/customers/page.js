'use client'

import { useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import DynamicListCustomerMembersClient from '@/components/dynamic-list/DynamicListCustomerMembersClient'

export default function DynamicListCustomerMembersPage() {
  const params = useParams()
  const id = String(params?.id || '')

  return (
    <MainLayout title="Customer list members" subtitle="View customers in this dynamic list">
      <DynamicListCustomerMembersClient listId={id} />
    </MainLayout>
  )
}
