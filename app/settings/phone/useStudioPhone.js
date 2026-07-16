'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { getEffectiveBranch } from '@/lib/auth'

const initialState = {
  status: 'loading',
  twilioNumber: null,
  twilioPhoneSid: null,
  vapiPhoneNumberId: null,
  connectedAt: null,
  lastError: null,
  webhookVoiceUrl: null,
  webhookSmsUrl: null,
  setupNote: null,
}

export function useStudioPhone() {
  const [state, setState] = useState(initialState)
  const [locationId, setLocationId] = useState(() => getEffectiveBranch())

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    const result = await api.get('/api/location-phone/status')
    if (result.success && result.data) {
      setState({
        status: result.data.status || 'disconnected',
        twilioNumber: result.data.twilioNumber ?? null,
        twilioPhoneSid: result.data.twilioPhoneSid ?? null,
        vapiPhoneNumberId: result.data.vapiPhoneNumberId ?? null,
        connectedAt: result.data.connectedAt ?? null,
        lastError: result.data.lastError ?? null,
        webhookVoiceUrl: result.data.webhookVoiceUrl ?? null,
        webhookSmsUrl: result.data.webhookSmsUrl ?? null,
        setupNote: result.data.setupNote ?? null,
      })
    } else {
      setState({
        ...initialState,
        status: 'disconnected',
        lastError: result.error || null,
      })
    }
  }, [])

  // Re-load when the active studio changes (header branch switcher).
  useEffect(() => {
    const syncLocation = () => {
      const next = getEffectiveBranch()
      setLocationId((prev) => (prev === next ? prev : next))
    }
    syncLocation()
    window.addEventListener('branch-change', syncLocation)
    window.addEventListener('storage', syncLocation)
    return () => {
      window.removeEventListener('branch-change', syncLocation)
      window.removeEventListener('storage', syncLocation)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, locationId])

  const connect = useCallback(
    async (twilioNumber) => {
      const result = await api.post('/api/location-phone/connect', { twilioNumber })
      if (result.success) await refresh()
      return { success: result.success, error: result.error, data: result.data }
    },
    [refresh],
  )

  const disconnect = useCallback(async () => {
    const result = await api.post('/api/location-phone/disconnect', {})
    if (result.success) await refresh()
    return { success: result.success, error: result.error }
  }, [refresh])

  return { ...state, refresh, connect, disconnect }
}
