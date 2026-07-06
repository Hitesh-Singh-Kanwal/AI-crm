'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const initialState = {
  status: 'loading',
  merchantId: null,
  merchantName: null,
  connectedAt: null,
  lastError: null,
}

export function useCloverConnection() {
  const [state, setState] = useState(initialState)

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    const result = await api.get('/api/payments/clover/status')
    if (result.success && result.data) {
      setState({
        status: result.data.status || 'disconnected',
        merchantId: result.data.merchantId ?? null,
        merchantName: result.data.merchantName ?? null,
        connectedAt: result.data.connectedAt ?? null,
        lastError: result.data.lastError ?? null,
      })
    } else {
      setState({ ...initialState, status: 'disconnected', lastError: result.error || null })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(() => {
    window.location.href = `${API_BASE}/api/payments/clover/connect`
  }, [])

  const disconnect = useCallback(async () => {
    const result = await api.post('/api/payments/clover/disconnect', {})
    if (result.success) {
      await refresh()
    }
    return { success: result.success, error: result.error }
  }, [refresh])

  return { ...state, refresh, connect, disconnect }
}
