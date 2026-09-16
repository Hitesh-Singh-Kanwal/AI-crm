export const DEFAULT_VAPI_ELEVENLABS_TTS_MODEL_ID = 'eleven_v3'

export const VAPI_ELEVENLABS_VOICE_DEFAULTS = {
  stability: 0.45,
  similarityBoost: 0.75,
  speed: 1,
  style: 0.35,
}

/** Vapi `voice.model` allow-list for ElevenLabs voices. */
export const VAPI_ELEVENLABS_VOICE_MODEL_OPTIONS = [
  { value: 'eleven_flash_v2', label: 'Flash v2 - low latency' },
  { value: 'eleven_flash_v2_5', label: 'Flash v2.5' },
  { value: 'eleven_turbo_v2', label: 'Turbo v2' },
  { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5 - balanced latency / quality' },
  { value: 'eleven_v3', label: 'v3 - expressive dialogue' },
  { value: 'eleven_multilingual_v2', label: 'Multilingual v2' },
  { value: 'eleven_monolingual_v1', label: 'Monolingual v1 (legacy)' },
]

export const VAPI_ELEVENLABS_SPEED_MAX = 1.2
export const VAPI_ELEVENLABS_SPEED_MIN = 0.5

export function clampVapiElevenLabsSpeedForUi(value, fallback = 1) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(VAPI_ELEVENLABS_SPEED_MAX, Math.max(VAPI_ELEVENLABS_SPEED_MIN, n))
}

/**
 * OpenAI models Vapi currently lists for assistant `model.model`.
 * Prices are OpenAI list rates (input / output per 1M tokens), not Vapi telephony.
 * `gpt-realtime-2` is omitted — it is a speech-to-speech model, not a chat LLM.
 * Latency is Vapi-style model P50 time-to-first-token in ms (reasoning off, as Vapi
 * runs voice agents). GPT-5.6 Sol is the live Vapi dashboard figure (1,060 ms).
 * Other values are reasoning-off TTFT rounded to match that same metric.
 */
export const VAPI_LLM_OPTION_GROUPS = [
  {
    label: 'GPT-5.6',
    options: [
      {
        value: 'gpt-5.6-sol',
        label: 'GPT-5.6 Sol',
        badge: 'Highest quality',
        badgeClass: 'bg-brand/10 text-brand',
        price: '$4 / $20 per 1M tokens',
        latencyMs: 1060,
        quality: 5,
        qualityLabel: 'Excellent',
        supportsTemperature: false,
        description: 'Strongest 5.6 model. Best on messy objections and tool use. Too slow and expensive for everyday studio calls.',
      },
      {
        value: 'gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        badge: 'Checks details',
        badgeClass: 'bg-primary/10 text-primary',
        price: '$2 / $12 per 1M tokens',
        latencyMs: 960,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: false,
        description: 'Newer model that thinks briefly before it speaks. Good if you want extra care on booking details without paying for Sol.',
      },
      {
        value: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        badge: 'Cheapest 5.6',
        badgeClass: 'bg-warning/10 text-warning',
        price: '$0.20 / $1.20 per 1M tokens',
        latencyMs: 910,
        quality: 3,
        qualityLabel: 'Good',
        supportsTemperature: false,
        description: 'Cheapest 5.6 tier. Fine for simple chats. Weaker when the lead’s details conflict.',
      },
    ],
  },
  {
    label: 'GPT-5.5 & Instant',
    options: [
      {
        value: 'gpt-5.5',
        label: 'GPT-5.5',
        badge: 'Premium',
        badgeClass: 'bg-brand/10 text-brand',
        price: '$5 / $30 per 1M tokens',
        latencyMs: 990,
        quality: 5,
        qualityLabel: 'Excellent',
        supportsTemperature: false,
        description: 'Premium flagship. Very capable, but costly for high-volume outbound calling.',
      },
      {
        value: 'chat-latest',
        label: 'GPT Instant',
        badge: 'Latest Instant',
        badgeClass: 'bg-info/10 text-info',
        price: '$5 / $30 per 1M tokens',
        latencyMs: 1250,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: true,
        description: 'Vapi’s GPT Instant (`chat-latest`). Fast ChatGPT-style replies. Price is high relative to 4.1 / 5.4 Mini.',
      },
    ],
  },
  {
    label: 'GPT-5.4',
    options: [
      {
        value: 'gpt-5.4',
        label: 'GPT-5.4',
        badge: 'Strong',
        badgeClass: 'bg-primary/10 text-primary',
        price: '$2.50 / $15 per 1M tokens',
        latencyMs: 960,
        quality: 5,
        qualityLabel: 'Excellent',
        supportsTemperature: false,
        description: 'Strong newer flagship. Better than GPT-5 / 5.1 for hard conversations; a bit more latency than 4.1.',
      },
      {
        value: 'gpt-5.4-mini',
        label: 'GPT-5.4 Mini',
        badge: 'Recommended',
        badgeClass: 'bg-success/10 text-success',
        price: '$0.75 / $4.50 per 1M tokens',
        latencyMs: 740,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: false,
        description: 'Best new mid-tier for live calls: clearly better than 4o Mini, much cheaper than full 5.4.',
      },
      {
        value: 'gpt-5.4-nano',
        label: 'GPT-5.4 Nano',
        badge: 'Budget',
        badgeClass: 'bg-warning/10 text-warning',
        price: '$0.20 / $1.25 per 1M tokens',
        latencyMs: 840,
        quality: 2,
        qualityLabel: 'Fair',
        supportsTemperature: false,
        description: 'Cheap and fast. Can sound scripted and miss context — not ideal as the main sales agent.',
      },
    ],
  },
  {
    label: 'GPT-5 / 5.1 / 5.2',
    options: [
      {
        value: 'gpt-5.2',
        label: 'GPT-5.2',
        badge: 'Capable',
        badgeClass: 'bg-primary/10 text-primary',
        price: '$1.75 / $14 per 1M tokens',
        latencyMs: 1010,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: false,
        description: 'Previous-gen flagship. Solid instruction following with a short reasoning pause.',
      },
      {
        value: 'gpt-5.1',
        label: 'GPT-5.1',
        price: '$1.25 / $10 per 1M tokens',
        latencyMs: 1170,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: false,
        description: 'Same price as GPT-5 with slightly better behavior. 5.4 Mini is usually a better live-call pick now.',
      },
      {
        value: 'gpt-5',
        label: 'GPT-5',
        price: '$1.25 / $10 per 1M tokens',
        latencyMs: 1300,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: false,
        description: 'Original GPT-5. Still usable; prefer 5.1 or 5.4 Mini unless you are comparing.',
      },
      {
        value: 'gpt-5-mini',
        label: 'GPT-5 Mini',
        badge: 'Lower cost',
        badgeClass: 'bg-info/10 text-info',
        price: '$0.25 / $2 per 1M tokens',
        latencyMs: 900,
        quality: 3,
        qualityLabel: 'Good',
        supportsTemperature: false,
        description: 'Inexpensive GPT-5-class model. Better than Nano; weaker than 4.1 on messy booking chats.',
      },
      {
        value: 'gpt-5-nano',
        label: 'GPT-5 Nano',
        badge: 'Cheapest',
        badgeClass: 'bg-warning/10 text-warning',
        price: '$0.05 / $0.40 per 1M tokens',
        latencyMs: 950,
        quality: 2,
        qualityLabel: 'Fair',
        supportsTemperature: false,
        description: 'Lowest OpenAI list price on this list. Too light for natural sales conversations.',
      },
    ],
  },
  {
    label: 'GPT-4.1 & 4o',
    options: [
      {
        value: 'gpt-4.1',
        label: 'GPT-4.1',
        badge: 'Best for calls',
        badgeClass: 'bg-success/10 text-success',
        price: '$2 / $8 per 1M tokens',
        latencyMs: 970,
        quality: 5,
        qualityLabel: 'Excellent',
        supportsTemperature: true,
        description: 'Best everyday live-call model: follows the studio script, handles tools well, and answers immediately.',
      },
      {
        value: 'gpt-4.1-mini',
        label: 'GPT-4.1 Mini',
        badge: 'Fast & cheap',
        badgeClass: 'bg-info/10 text-info',
        price: '$0.40 / $1.60 per 1M tokens',
        latencyMs: 900,
        quality: 3,
        qualityLabel: 'Good',
        supportsTemperature: true,
        description: 'Solid lower-cost option when the script is clear. Weaker when details conflict.',
      },
      {
        value: 'gpt-4o',
        label: 'GPT-4o',
        badge: 'Legacy',
        badgeClass: 'bg-muted text-muted-foreground',
        price: '$2.50 / $10 per 1M tokens',
        latencyMs: 1020,
        quality: 4,
        qualityLabel: 'Strong',
        supportsTemperature: true,
        description: 'Kept for existing personas. GPT-4.1 is similar latency at a lower cost and usually follows the script better.',
      },
      {
        value: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        badge: 'Default',
        badgeClass: 'bg-muted text-muted-foreground',
        price: '$0.15 / $0.60 per 1M tokens',
        latencyMs: 990,
        quality: 3,
        qualityLabel: 'Good',
        supportsTemperature: true,
        description: 'Current default. Cheap and fast. Upgrade to 4.1 or 5.4 Mini if the agent misses context.',
      },
    ],
  },
  {
    label: 'Deep reasoning',
    options: [
      {
        value: 'o3',
        label: 'o3',
        badge: 'Slow for live calls',
        badgeClass: 'bg-warning/10 text-warning',
        price: '$2 / $8 per 1M tokens',
        latencyMs: 6340,
        quality: 5,
        qualityLabel: 'Excellent',
        supportsTemperature: false,
        description: 'Deep reasoning model. High quality, but the pause is usually too long for natural phone conversation.',
      },
    ],
  },
]

export function formatVapiLlmLatencyMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return `${Math.round(ms).toLocaleString('en-US')} ms`
}

export const VAPI_LLM_OPTIONS = VAPI_LLM_OPTION_GROUPS.flatMap((group) =>
  group.options.map((opt) => ({
    ...opt,
    group: group.label,
    latency: formatVapiLlmLatencyMs(opt.latencyMs),
  })),
)

export function getVapiLlmOption(modelId) {
  if (!modelId || typeof modelId !== 'string') return null
  const id = modelId.trim()
  if (!id) return null
  return VAPI_LLM_OPTIONS.find((opt) => opt.value === id) || null
}

export function vapiLlmLabel(modelId, fallback = 'gpt-4o-mini') {
  const id = modelId || fallback
  return getVapiLlmOption(id)?.label || id
}

export function vapiLlmSupportsTemperature(modelId) {
  const opt = getVapiLlmOption(modelId)
  if (!opt) return true
  return opt.supportsTemperature !== false
}

export function vapiLlmOptionsWithSaved(savedId) {
  const id = typeof savedId === 'string' ? savedId.trim() : ''
  if (id && !VAPI_LLM_OPTIONS.some((opt) => opt.value === id)) {
    return [
      {
        value: id,
        label: `${id} (saved)`,
        group: 'Currently saved',
        price: 'Unknown list price',
        latencyMs: null,
        latency: '—',
        quality: 0,
        qualityLabel: 'Unlisted',
        supportsTemperature: true,
        description: 'This persona is on a model that is no longer in the Vapi picker. Choose one below to switch.',
      },
      ...VAPI_LLM_OPTIONS,
    ]
  }
  return VAPI_LLM_OPTIONS
}

export function clampVapiLlmTemperature(value, fallback = 0.65) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(1, Math.max(0, n))
}

export const VAPI_SUCCESS_EVALUATION_RUBRICS = [
  { value: 'PassFail', label: 'Pass / Fail' },
  { value: 'NumericScale', label: 'Numeric scale (1–10)' },
  { value: 'PercentageScale', label: 'Percentage (0–100%)' },
  { value: 'DescriptiveScale', label: 'Descriptive (Excellent → Poor)' },
  { value: 'LikertScale', label: 'Likert scale' },
  { value: 'Checklist', label: 'Checklist' },
  { value: 'Matrix', label: 'Matrix' },
  { value: 'AutomaticRubric', label: 'Automatic rubric' },
]

export const DEFAULT_SUCCESS_EVALUATION_RUBRIC = 'PassFail'

export const DEFAULT_SUCCESS_EVALUATION_PROMPT =
  'You are an expert call evaluator. Review the transcript and determine whether the call achieved its goals based on the assistant script and conversation outcome.'
