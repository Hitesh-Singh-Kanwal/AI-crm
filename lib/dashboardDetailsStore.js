'use client'

import { useSyncExternalStore } from 'react'

// Holds the most recent "Show details" request in memory so the dashboard's
// details page (a client-side navigation, not a reload) can pick it back up
// without needing to serialize column `format` functions into the URL.
let current = null
const listeners = new Set()

export function setDashboardDetailsRequest(payload) {
  current = payload
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDashboardDetailsRequest() {
  return useSyncExternalStore(subscribe, () => current, () => null)
}
