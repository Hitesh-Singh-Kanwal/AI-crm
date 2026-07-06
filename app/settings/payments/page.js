'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { useToast } from '@/components/ui/toast'
import CloverConnectionCard from './clover/CloverConnectionCard'

const COMING_SOON_PROVIDERS = ['Stripe', 'Square', 'PayPal', 'Authorize.net']

export default function PaymentsSettingsPage() {
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
      toast.error({ title: 'Clover connection failed', message: reason || 'Unable to complete the Clover connection.' })
    }

    router.replace('/settings/payments')
  }, [searchParams, router, toast])

  return (
    <MainLayout title="Payments" subtitle="Connect payment providers for this location.">
      <div className="space-y-4">
        <CloverConnectionCard />
        {COMING_SOON_PROVIDERS.map((name) => (
          <article key={name} className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 opacity-60 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-foreground">{name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Coming soon</p>
            </div>
          </article>
        ))}
      </div>
    </MainLayout>
  )
}
