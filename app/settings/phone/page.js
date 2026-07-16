'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Phone settings now live under Settings → Integrations. */
export default function PhoneSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings/integrations')
  }, [router])

  return null
}
