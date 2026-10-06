'use client'

import { useEffect, useState } from 'react'
import { isNotificationEnabled } from '../notificationPreferences'

/**
 * Live "is this alert on?" for components. Starts ON (matching server render and
 * the default for anyone who never opted out), then reads the saved preference
 * after mount and follows later changes.
 */
export function useNotificationEnabled(key) {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const sync = () => setEnabled(isNotificationEnabled(key))
    sync()
    window.addEventListener('session-refresh', sync)
    return () => window.removeEventListener('session-refresh', sync)
  }, [key])

  return enabled
}
