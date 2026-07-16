'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { useToast } from '@/components/ui/toast'
import StudioPhoneCard from '@/app/settings/phone/StudioPhoneCard'
import CloverConnectionCard from '@/app/settings/payments/clover/CloverConnectionCard'

function CloverCallbackStatusHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  useEffect(() => {
    const status = searchParams.get('status')
    if (!status) return

    if (status === 'connected') {
      toast.success({ title: 'Clover connected', message: 'This location is now connected to Clover.' })
    } else if (status === 'error') {
      const reason = searchParams.get('reason')
      toast.error({
        title: 'Clover connection failed',
        message: reason || 'Unable to complete the Clover connection.',
      })
    }

    router.replace('/settings/integrations')
  }, [searchParams, router, toast])

  return null
}

export default function IntegrationsPage() {
  return (
    <MainLayout
      title="Integrations"
      subtitle="Connect phone and payments for this studio."
    >
      <Suspense fallback={null}>
        <CloverCallbackStatusHandler />
      </Suspense>
      <div className="space-y-4">
        <StudioPhoneCard />
        <CloverConnectionCard />
      </div>
    </MainLayout>
  )
}
