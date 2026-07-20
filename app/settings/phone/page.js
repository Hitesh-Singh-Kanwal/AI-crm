'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RedirectToIntegrations() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(qs ? `/settings/integrations?${qs}` : '/settings/integrations')
  }, [router, searchParams])

  return null
}

/** Phone settings now live under Settings → Integrations. */
export default function PhoneSettingsPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToIntegrations />
    </Suspense>
  )
}
