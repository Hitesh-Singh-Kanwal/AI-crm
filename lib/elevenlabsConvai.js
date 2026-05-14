/** Default matches backend `HUMAN_CONFIG.elevenLabs.model` for ConvAI agents. */
export const DEFAULT_ELEVENLABS_TTS_MODEL_ID = 'eleven_v3_conversational'

/** True for Flash, Multilingual, etc. — v3 conversational uses expressive_mode instead of classic voice sliders in the product copy. */
export function isNonV3ConvaiTtsModel(ttsModelId) {
  const id = String(ttsModelId || '').trim()
  if (!id) return false
  return !/^eleven_v3_conversational$/i.test(id)
}

/** Defaults aligned with backend `HUMAN_CONFIG.elevenLabs` when persona has no values. */
export const CONVAI_TTS_VOICE_DEFAULTS = {
  stability: 0.4,
  similarityBoost: 0.75,
  speed: 1,
}

/**
 * ConvAI agent `conversation_config.tts.model_id` — same three families the ElevenLabs agent
 * builder highlights (Flash, v3 conversational, Multilingual). Extra legacy Turbo IDs are omitted;
 * assistants already saved with another `model_id` still show as “(saved)” in the select.
 */
export const ELEVENLABS_CONVAI_TTS_OPTIONS = [
  {
    value: 'eleven_flash_v2',
    label: 'Flash v2 — low latency (English ConvAI; bracket tags are read as words)',
  },
  {
    value: 'eleven_v3_conversational',
    label: 'v3 Conversational — live dialogue + audio tags as real sounds',
  },
  {
    value: 'eleven_multilingual_v2',
    label: 'Multilingual v2 — non‑English; bracket tags read as words',
  },
]

/** Default when opening Make Calls under Vapi (ConvAI-only ids are invalid there). */
export const DEFAULT_VAPI_ELEVENLABS_TTS_MODEL_ID = 'eleven_v3'

/**
 * Vapi `voice.model` allow-list only — matches `DanceStudio-CRM-Backend` `vapi.service.js`.
 * Do not add ConvAI-only values like `eleven_v3_conversational`.
 */
export const VAPI_ELEVENLABS_VOICE_MODEL_OPTIONS = [
  { value: 'eleven_flash_v2', label: 'Flash v2 — low latency' },
  { value: 'eleven_flash_v2_5', label: 'Flash v2.5' },
  { value: 'eleven_turbo_v2', label: 'Turbo v2' },
  { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5 — balanced latency / quality' },
  { value: 'eleven_v3', label: 'v3 — expressive dialogue' },
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2' },
  { value: 'eleven_monolingual_v1', label: 'Monolingual v1 (legacy)' },
]

/** Vapi + ElevenLabs rejects `voice.speed` above 1.2. */
export const VAPI_ELEVENLABS_SPEED_MAX = 1.2
export const VAPI_ELEVENLABS_SPEED_MIN = 0.5

export function clampVapiElevenLabsSpeedForUi(value, fallback = 1) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(VAPI_ELEVENLABS_SPEED_MAX, Math.max(VAPI_ELEVENLABS_SPEED_MIN, n))
}

/**
 * When `/v1/convai/llm/list` returns a long catalog, rank entries like the agent UI: GPT → Gemini → Claude → rest (A–Z).
 * Prefer live list; this is only ordering, not a second source of truth.
 */
export function orderConvaiLlmsForUi(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || []
  const rank = (id) => {
    const v = String(id || '').toLowerCase()
    if (v.startsWith('gpt-5')) return 0
    if (v.startsWith('gpt-4o')) return 1
    if (v.startsWith('gpt-4.1')) return 2
    if (v.startsWith('gpt-4')) return 3
    if (v.startsWith('gemini')) return 4
    if (v.startsWith('claude')) return 5
    if (v.startsWith('eleven_')) return 6
    return 50
  }
  return [...rows].sort((a, b) => {
    const d = rank(a.value) - rank(b.value)
    return d !== 0 ? d : String(a.value).localeCompare(String(b.value))
  })
}

/** Offline fallback when the list endpoint is empty — short OpenAI-heavy set, not the full vendor catalog. */
export const FALLBACK_CONVAI_LLM_OPTIONS = [
  'gpt-5',
  'gpt-5.1',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4-turbo',
].map((id) => ({ value: id, label: id }))

/** ConvAI agent LLM temperature — ElevenLabs dashboards use 0–1 (not OpenAI’s 0–2). */
export function clampConvaiLlmTemperature(value, fallback = 0.75) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(1, Math.max(0, n))
}

/**
 * Normalize ConvAI LLM list payloads from the API client (`data` = body `data` field).
 */
export function normalizeConvaiLlmApiPayload(data) {
  if (!data) return []
  const raw = data.llms ?? data.models
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (typeof row === 'string') return { value: row, label: row }
      const value = row?.value ?? row?.llm ?? row?.id ?? row?.model_id
      if (!value) return null
      const label = row?.label ?? row?.name ?? row?.display_name ?? String(value)
      return { value: String(value), label: String(label) }
    })
    .filter(Boolean)
}
