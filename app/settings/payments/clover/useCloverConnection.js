'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'

const initialState = {
  status: 'loading',
  merchantId: null,
  merchantName: null,
  connectedAt: null,
  ecommercePublicKey: null,
  lastError: null,
  webhookUrl: null,
  // Clover issues a signing secret per merchant, and without it their webhook can't be
  // verified — so a card payment could never be confirmed. Every card Pay button gates
  // on this as well as on `status`.
  webhookSecretSaved: false,
  webhookLastReceivedAt: null,
  webhookLastError: null,
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
        ecommercePublicKey: result.data.ecommercePublicKey ?? null,
        lastError: result.data.lastError ?? null,
        webhookUrl: result.data.webhookUrl ?? null,
        webhookSecretSaved: Boolean(result.data.webhookSecretSaved),
        webhookLastReceivedAt: result.data.webhookLastReceivedAt ?? null,
        webhookLastError: result.data.webhookLastError ?? null,
      })
    } else {
      setState({ ...initialState, status: 'disconnected', lastError: result.error || null })
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    const result = await api.get('/api/payments/clover/connect')
    if (result.success && result.data?.authorizeUrl) {
      window.location.href = result.data.authorizeUrl
      return { success: true }
    }
    return { success: false, error: result.error || 'Unable to start the Clover connection.' }
  }, [])

  const disconnect = useCallback(async () => {
    const result = await api.post('/api/payments/clover/disconnect', {})
    if (result.success) {
      await refresh()
    }
    return { success: result.success, error: result.error }
  }, [refresh])

  const saveWebhookSecret = useCallback(async (secret) => {
    const result = await api.post('/api/payments/clover/webhook-secret', { secret })
    if (result.success) await refresh()
    return { success: result.success, error: result.error }
  }, [refresh])

  // Clover only sends a webhook when a payment happens, so "a webhook has arrived"
  // can't gate the first payment. A saved secret is what we can require up front.
  const cloverReady = state.status === 'connected' && state.webhookSecretSaved

  return { ...state, cloverReady, refresh, connect, disconnect, saveWebhookSecret }
}
