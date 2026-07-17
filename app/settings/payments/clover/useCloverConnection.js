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

/** Normalize customer/plan/location refs to a single location id string. */
export function resolveLocationID(source) {
  if (source == null || source === '') return null
  if (typeof source === 'string' || typeof source === 'number') return String(source)
  if (Array.isArray(source)) {
    return source.length ? resolveLocationID(source[0]) : null
  }
  if (source.locationID !== undefined) {
    return resolveLocationID(source.locationID)
  }
  if (source._id) return String(source._id)
  return null
}

export function useCloverConnection(locationID) {
  const [state, setState] = useState(initialState)
  const resolvedLocationID = resolveLocationID(locationID)

  const refresh = useCallback(async () => {
    if (!resolvedLocationID) {
      setState({ ...initialState, status: 'disconnected' })
      return
    }
    setState((prev) => ({ ...prev, status: 'loading' }))
    const result = await api.get(`/api/payments/clover/status?locationID=${encodeURIComponent(resolvedLocationID)}`)
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
  }, [resolvedLocationID])

  useEffect(() => {
    refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    if (!resolvedLocationID) {
      return { success: false, error: 'Select a location first.' }
    }
    const result = await api.get(`/api/payments/clover/connect?locationID=${encodeURIComponent(resolvedLocationID)}`)
    if (result.success && result.data?.authorizeUrl) {
      window.location.href = result.data.authorizeUrl
      return { success: true }
    }
    return { success: false, error: result.error || 'Unable to start the Clover connection.' }
  }, [resolvedLocationID])

  const disconnect = useCallback(async () => {
    if (!resolvedLocationID) {
      return { success: false, error: 'Select a location first.' }
    }
    const result = await api.post('/api/payments/clover/disconnect', { locationID: resolvedLocationID })
    if (result.success) {
      await refresh()
    }
    return { success: result.success, error: result.error }
  }, [resolvedLocationID, refresh])

  const saveWebhookSecret = useCallback(async (secret) => {
    if (!resolvedLocationID) {
      return { success: false, error: 'Select a location first.' }
    }
    const result = await api.post('/api/payments/clover/webhook-secret', { secret, locationID: resolvedLocationID })
    if (result.success) await refresh()
    return { success: result.success, error: result.error }
  }, [resolvedLocationID, refresh])

  // Clover only sends a webhook when a payment happens, so "a webhook has arrived"
  // can't gate the first payment. A saved secret is what we can require up front.
  const cloverReady = state.status === 'connected' && state.webhookSecretSaved

  return { ...state, cloverReady, refresh, connect, disconnect, saveWebhookSecret }
}
