'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { resolveLocationID } from './useCloverConnection'

/**
 * Lists this location's *paired* Clover terminals — what a "Pay with Terminal"
 * device picker offers. Separate from `listAvailable` (below), which hits Clover
 * live and is only used by the Settings pairing UI.
 */
export function useCloverDevices(locationID) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const resolvedLocationID = resolveLocationID(locationID)

  const refresh = useCallback(async () => {
    if (!resolvedLocationID) {
      setDevices([])
      setLoading(false)
      return
    }
    setLoading(true)
    const result = await api.get(`/api/payments/clover/devices?locationID=${encodeURIComponent(resolvedLocationID)}`)
    setDevices(result.success && Array.isArray(result.data) ? result.data : [])
    setLoading(false)
  }, [resolvedLocationID])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { devices, loading, refresh }
}

/** Live list from Clover (cross-referenced against paired devices) — settings-only. */
export async function listAvailableDevices(locationID) {
  const resolved = resolveLocationID(locationID)
  if (!resolved) return { success: false, error: 'Select a location first.' }
  return api.get(`/api/payments/clover/devices/available?locationID=${encodeURIComponent(resolved)}`)
}

export async function pairDevice(locationID, { deviceId, name, serial, model }) {
  const resolved = resolveLocationID(locationID)
  if (!resolved) return { success: false, error: 'Select a location first.' }
  return api.post('/api/payments/clover/devices', { locationID: resolved, deviceId, name, serial, model })
}

export async function renameDevice(locationID, id, { name }) {
  const resolved = resolveLocationID(locationID)
  if (!resolved) return { success: false, error: 'Select a location first.' }
  return api.patch(`/api/payments/clover/devices/${id}?locationID=${encodeURIComponent(resolved)}`, { name })
}

export async function unpairDevice(locationID, id) {
  const resolved = resolveLocationID(locationID)
  if (!resolved) return { success: false, error: 'Select a location first.' }
  return api.delete(`/api/payments/clover/devices/${id}?locationID=${encodeURIComponent(resolved)}`)
}
