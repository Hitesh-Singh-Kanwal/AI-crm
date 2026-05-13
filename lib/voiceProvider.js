/**
 * Synced from GET /api/voice/provider-settings when using AI automation routes.
 * Before hydration, behaviour defaults to ElevenLabs (same as backend platform default).
 */
let _clientEffective = null

function normalizeSlug(raw) {
  const p = String(raw || '')
    .toLowerCase()
    .trim()
  if (!p) return 'elevenlabs'
  if (p === '11labs' || p === 'elevenlabs') return 'elevenlabs'
  if (p === 'vapi') return 'vapi'
  return 'elevenlabs'
}

/** Called when org voice settings are loaded or updated (keeps non-React code in sync). */
export function syncVoiceProviderFromServer(effective) {
  _clientEffective = normalizeSlug(effective)
}

export function getVoiceProvider() {
  if (typeof window !== 'undefined' && _clientEffective) {
    return _clientEffective
  }
  return 'elevenlabs'
}

export function isElevenLabsProvider() {
  return getVoiceProvider() === 'elevenlabs'
}

export function isVapiProvider() {
  return getVoiceProvider() === 'vapi'
}
