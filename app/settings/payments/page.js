'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RedirectToIntegrations() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(qs ? `/settings/integrations?${qs}` : '/settings/integrations')
  }, [router, searchParams])

  return null
}

/** Payments settings now live under Settings → Integrations (Clover only). */
export default function PaymentsSettingsPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToIntegrations />
    </Suspense>
  )
}
