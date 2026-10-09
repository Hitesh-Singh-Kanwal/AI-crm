'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { getEffectiveBranch } from '@/lib/auth'
import { getStudioTimezone, setStudioTimezone } from '@/lib/studioTimezone'

/**
 * IANA timezone of the active studio location.
 *
 * Lesson times are UTC instants; rendering them without this shows the viewer's browser
 * zone instead of the studio's, so the same booking reads differently in New York and
 * Los Angeles. The active branch is sent via the x-location-id header, so the first
 * location returned belongs to the branch the user is currently working in.
 *
 * Resolved once per page load (switching branch reloads the page) and shared through
 * lib/studioTimezone, which the plain date helpers read. The last value per branch is
 * kept in localStorage so later loads have it before the first render.
 */
let resolved = false
let inFlight = null

const storageKey = () => `crm_studio_tz:${getEffectiveBranch() || 'all'}`

/** Load this branch's last-known timezone into the shared slot. Returns it, or null. */
export function loadCachedStudioTimezone() {
  try {
    const tz = localStorage.getItem(storageKey())
    if (tz) setStudioTimezone(tz)
    return tz
  } catch {
    return null
  }
}

/** Fetch the studio timezone (once per page load) into the shared slot. */
export function resolveStudioTimezone() {
  if (resolved) return Promise.resolve(getStudioTimezone())
  if (inFlight) return inFlight
  inFlight = api
    .get('/api/location?limit=50')
    .then((res) => {
      const list = Array.isArray(res?.data) ? res.data : []
      const tz = list.find((l) => l?.timezone)?.timezone || list[0]?.timezone || null
      if (tz) {
        setStudioTimezone(tz)
        try {
          localStorage.setItem(storageKey(), tz)
        } catch {
          // Storage blocked — it is fetched again next load.
        }
      }
      resolved = true
      return getStudioTimezone()
    })
    .catch(() => getStudioTimezone())
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
  const [timezone, setTimezone] = useState(preferred || getStudioTimezone())

  useEffect(() => {
    if (preferred) {
      setTimezone(preferred)
      return
    }
    let active = true
    resolveStudioTimezone().then((tz) => {
      if (active && tz) setTimezone(tz)
    })
    return () => {
      active = false
    }
  }, [preferred])

  return timezone
}

export default useStudioTimezone
