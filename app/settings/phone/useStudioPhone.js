'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { resolveLocationID } from '@/app/settings/payments/clover/useCloverConnection'

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

export function useStudioPhone(locationID) {
  const [state, setState] = useState(initialState)
  const resolvedLocationID = resolveLocationID(locationID)

  const refresh = useCallback(async () => {
    if (!resolvedLocationID) {
      setState({ ...initialState, status: 'disconnected' })
      return
    }
    setState((prev) => ({ ...prev, status: 'loading' }))
    const result = await api.get(
      `/api/location-phone/status?locationID=${encodeURIComponent(resolvedLocationID)}`,
    )
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
        status: 'error',
        lastError: result.error || 'Unable to load studio phone status.',
      })
    }
  }, [resolvedLocationID])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(
    async (twilioNumber) => {
      if (!resolvedLocationID) {
        return { success: false, error: 'Select a location first.' }
      }
      const result = await api.post('/api/location-phone/connect', {
        twilioNumber,
        locationID: resolvedLocationID,
      })
      if (result.success) await refresh()
      return { success: result.success, error: result.error, data: result.data }
    },
    [resolvedLocationID, refresh],
  )

  const disconnect = useCallback(async () => {
    if (!resolvedLocationID) {
      return { success: false, error: 'Select a location first.' }
    }
    const result = await api.post('/api/location-phone/disconnect', {
      locationID: resolvedLocationID,
    })
    if (result.success) await refresh()
    return { success: result.success, error: result.error }
  }, [resolvedLocationID, refresh])

  return { ...state, refresh, connect, disconnect }
}
