'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'

/** Studio phone now lives on Settings → Studio (create/edit location). */
function RedirectToStudio() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings/studio')
  }, [router])
  return null
}

export default function PhoneSettingsRedirectPage() {
  return (
    <MainLayout title="Studio phone" subtitle="Redirecting…">
      <Suspense fallback={null}>
        <RedirectToStudio />
      </Suspense>
    </MainLayout>
  )
}
