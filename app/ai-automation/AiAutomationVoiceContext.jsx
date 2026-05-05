'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import api from '@/lib/api'
import { syncVoiceProviderFromServer } from '@/lib/voiceProvider'

const AiAutomationVoiceContext = createContext(null)

export function AiAutomationVoiceProvider({ children }) {
  const [effectiveVoiceProvider, setEffectiveVoiceProvider] = useState('elevenlabs')
  const [organisationVoiceProvider, setOrganisationVoiceProvider] = useState(null)
  const [platformDefaultVoiceProvider, setPlatformDefaultVoiceProvider] = useState('elevenlabs')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const r = await api.get('/api/voice/provider-settings')
    if (r.success && r.data) {
      const eff = r.data.effectiveVoiceProvider || 'elevenlabs'
      setEffectiveVoiceProvider(eff)
      setOrganisationVoiceProvider(
        r.data.organisationVoiceProvider === undefined
          ? null
          : r.data.organisationVoiceProvider,
      )
      setPlatformDefaultVoiceProvider(
        r.data.platformDefaultVoiceProvider || 'elevenlabs',
      )
      syncVoiceProviderFromServer(eff)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateVoiceProvider = useCallback(async (voiceProvider) => {
    setSaving(true)
    const r = await api.patch('/api/voice/provider-settings', { voiceProvider })
    setSaving(false)
    if (r.success && r.data) {
      const eff = r.data.effectiveVoiceProvider || 'elevenlabs'
      setEffectiveVoiceProvider(eff)
      setOrganisationVoiceProvider(
        r.data.organisationVoiceProvider === undefined
          ? null
          : r.data.organisationVoiceProvider,
      )
      syncVoiceProviderFromServer(eff)
      return { ok: true, data: r.data }
    }
    return { ok: false, error: r.error }
  }, [])

  const value = useMemo(
    () => ({
      effectiveVoiceProvider,
      organisationVoiceProvider,
      platformDefaultVoiceProvider,
      loading,
      saving,
      refresh,
      updateVoiceProvider,
      isElevenLabs: effectiveVoiceProvider === 'elevenlabs',
      isVapi: effectiveVoiceProvider === 'vapi',
    }),
    [
      effectiveVoiceProvider,
      organisationVoiceProvider,
      platformDefaultVoiceProvider,
      loading,
      saving,
      refresh,
      updateVoiceProvider,
    ],
  )

  return (
    <AiAutomationVoiceContext.Provider value={value}>
      {children}
    </AiAutomationVoiceContext.Provider>
  )
}

export function useAiAutomationVoice() {
  const ctx = useContext(AiAutomationVoiceContext)
  if (!ctx) {
    throw new Error(
      'useAiAutomationVoice must be used inside app/ai-automation (see layout.js).',
    )
  }
  return ctx
}
