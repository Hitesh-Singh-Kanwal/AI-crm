'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

/**
 * IANA timezone of the active studio location.
 *
 * Lesson times are UTC instants; rendering them without this shows the viewer's browser
 * zone instead of the studio's, so the same booking reads differently in New York and
 * Los Angeles. The active branch is sent via the x-location-id header, so the first
 * location returned belongs to the branch the user is currently working in.
 *
 * Resolved once per page load and shared across components — several panels need the
 * same value and should not each issue their own request.
 */
let cachedTimezone = null
let inFlight = null

function fetchStudioTimezone() {
  if (cachedTimezone) return Promise.resolve(cachedTimezone)
  if (inFlight) return inFlight
  inFlight = api
    .get('/api/location?limit=50')
    .then((res) => {
      const list = Array.isArray(res?.data) ? res.data : []
      const tz = list.find((l) => l?.timezone)?.timezone || list[0]?.timezone || null
      if (tz) cachedTimezone = tz
      return cachedTimezone
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/**
 * @param {string|null} [preferred] Timezone already resolved by a parent — skips the fetch.
 * @returns {string|null} Studio IANA timezone, or null until it resolves.
 */
export function useStudioTimezone(preferred = null) {
  const [timezone, setTimezone] = useState(preferred || cachedTimezone)

  useEffect(() => {
    if (preferred) {
      setTimezone(preferred)
      return
    }
    if (cachedTimezone) {
      setTimezone(cachedTimezone)
      return
    }
    let active = true
    fetchStudioTimezone().then((tz) => {
      if (active && tz) setTimezone(tz)
    })
    return () => {
      active = false
    }
  }, [preferred])

  return timezone
}

export default useStudioTimezone
