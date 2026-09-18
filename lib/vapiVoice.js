export const DEFAULT_VAPI_ELEVENLABS_TTS_MODEL_ID = 'eleven_v3'

export const VAPI_ELEVENLABS_VOICE_DEFAULTS = {
  stability: 0.45,
  similarityBoost: 0.75,
  speed: 1,
  style: 0.35,
}

/**
 * Voice models in the AI Calling picker. Figures are from Vapi’s Humanness Index™
 * (humannessindex.vapi.ai), standings 17 Sep 2026. `null` / '—' means Vapi left
 * that cell blank. Price is Vapi’s “Price / 1M chars”. Latency is measured TTFB.
 * ElevenLabs TTS engines (Flash v2 / Turbo v2 / Multilingual / Monolingual) are
 * not listed here — this picker is voice models only. Saved engine ids still load.
 */
export const VAPI_TTS_OPTION_GROUPS = [
  {
    label: 'Voice models',
    options: [
      {
        value: 'eleven_v3',
        provider: '11labs',
        providerLabel: 'ElevenLabs',
        model: 'eleven_v3',
        label: 'Eleven v3',
        rank: '#1',
        likelyRank: '#1–5',
        humanness: 97,
        rating: 1282,
        votes: 580,
        latencyMs: 758,
        languages: '70+',
        price: '$100',
        description:
          'ElevenLabs Eleven v3 currently leads the Humanness Index™. Across blind listening tests it’s judged the most human-sounding voice in the field, the kind of delivery that holds up with real callers in production, not just in a demo.',
      },
      {
        value: 'xai:grok-tts',
        provider: 'xai',
        providerLabel: 'xAI',
        model: null,
        defaultVoiceId: 'eve',
        defaultVoiceName: 'Eve',
        label: 'Grok TTS',
        rank: '#3',
        likelyRank: '#1–6',
        humanness: 93,
        rating: 1270,
        votes: 568,
        latencyMs: 460,
        languages: '20',
        price: '$15',
        description:
          'xAI Grok TTS. Humanness 93, latency 460 ms, price $15 / 1M chars, 20 languages. Index likely rank #1–6.',
      },
      {
        value: 'minimax:speech-2.8',
        provider: 'minimax',
        providerLabel: 'MiniMax',
        model: 'speech-2.5-turbo-preview',
        defaultVoiceId: 'socialmedia_female_1_v1',
        defaultVoiceName: 'Social Media Female',
        label: 'Speech 2.8',
        rank: '#4',
        likelyRank: '#1–7',
        humanness: 93,
        rating: 1269,
        votes: 557,
        latencyMs: 325,
        languages: '40',
        price: '$60',
        description:
          'MiniMax Speech 2.8. Rank #4, humanness 93, measured latency 325 ms, 40 languages, price $60 / 1M chars. Index likely rank #1–7. Arena clips and latency are the turbo tier.',
      },
      {
        value: 'minimax:speech-02-hd',
        provider: 'minimax',
        providerLabel: 'MiniMax',
        model: 'speech-02-hd',
        defaultVoiceId: 'socialmedia_female_1_v1',
        defaultVoiceName: 'Social Media Female',
        label: 'Speech 2 HD',
        rank: '#5',
        likelyRank: '#2–8',
        humanness: 90,
        rating: 1260,
        votes: 537,
        latencyMs: 357,
        languages: '32',
        price: '$100',
        description:
          'MiniMax Speech 2 HD. Humanness 90, latency 357 ms, price $100 / 1M chars, 32 languages. Index likely rank #2–8.',
      },
      {
        value: 'inworld:inworld-tts-1.5-max',
        provider: 'inworld',
        providerLabel: 'Inworld',
        model: 'inworld-tts-1.5-max',
        defaultVoiceId: 'Sarah',
        defaultVoiceName: 'Sarah',
        label: 'TTS-1.5-max',
        rank: '#9',
        likelyRank: '#7–12',
        humanness: 79,
        rating: 1225,
        votes: 463,
        latencyMs: 337,
        languages: '15',
        price: '$35',
        description:
          'Inworld TTS-1.5-max. Humanness 79, latency 337 ms, price $35 / 1M chars, 15 languages. Index likely rank #7–12.',
      },
      {
        value: 'cartesia:sonic-3.5',
        provider: 'cartesia',
        providerLabel: 'Cartesia',
        model: 'sonic-3.5',
        defaultVoiceId: '248be419-c632-4f23-adf1-5324ed7dbf1d',
        defaultVoiceName: 'Professional Woman',
        label: 'Sonic 3.5',
        rank: '#12',
        likelyRank: '#10–17',
        humanness: 71,
        rating: null,
        votes: null,
        latencyMs: 128,
        languages: '42',
        price: '$50',
        description:
          'Cartesia Sonic 3.5. Rank #12, humanness 71, measured latency 128 ms, 42 languages, price $50 / 1M chars. Cartesia publishes sub 90 ms; Vapi’s measured median is 128 ms.',
      },
      {
        value: 'inworld:inworld-tts-2',
        provider: 'inworld',
        providerLabel: 'Inworld',
        model: 'inworld-tts-2',
        defaultVoiceId: 'Sarah',
        defaultVoiceName: 'Sarah',
        label: 'TTS-2',
        rank: '#13',
        likelyRank: '#11–17',
        humanness: 70,
        rating: null,
        votes: null,
        latencyMs: 288,
        languages: '100+',
        price: '$25',
        description:
          'Inworld TTS-2. Rank #13, humanness 70, measured latency 288 ms, 100+ languages, price $25 / 1M chars. Index likely rank #11–17.',
      },
      {
        value: 'minimax:speech-02-turbo',
        provider: 'minimax',
        providerLabel: 'MiniMax',
        model: 'speech-02-turbo',
        defaultVoiceId: 'socialmedia_female_1_v1',
        defaultVoiceName: 'Social Media Female',
        label: 'Speech 2 Turbo',
        rank: '#14',
        likelyRank: '#10–17',
        humanness: 70,
        rating: null,
        votes: null,
        latencyMs: 315,
        languages: '32',
        price: '$60',
        description:
          'MiniMax Speech 2 Turbo. Rank #14, humanness 70, measured latency 315 ms, 32 languages, price $60 / 1M chars. Index likely rank #10–17.',
      },
      {
        value: 'cartesia:sonic-2',
        provider: 'cartesia',
        providerLabel: 'Cartesia',
        model: 'sonic-2',
        defaultVoiceId: '248be419-c632-4f23-adf1-5324ed7dbf1d',
        defaultVoiceName: 'Professional Woman',
        label: 'Sonic 2',
        rank: '#16',
        likelyRank: '#12–17',
        humanness: 66,
        rating: null,
        votes: null,
        latencyMs: 159,
        languages: '15',
        price: '$50',
        description:
          'Cartesia Sonic 2. Rank #16, humanness 66, measured latency 159 ms, 15 languages, price $50 / 1M chars. Index likely rank #12–17. Cartesia publishes ~90 ms; Vapi’s measured median is 159 ms.',
      },
      {
        value: 'cartesia:sonic-3',
        provider: 'cartesia',
        providerLabel: 'Cartesia',
        model: 'sonic-3',
        defaultVoiceId: '248be419-c632-4f23-adf1-5324ed7dbf1d',
        defaultVoiceName: 'Professional Woman',
        label: 'Sonic 3',
        rank: '#17',
        likelyRank: '#12–17',
        humanness: 66,
        rating: null,
        votes: null,
        latencyMs: 166,
        languages: '42',
        price: '$50',
        description:
          'Cartesia Sonic 3. Rank #17, humanness 66, measured latency 166 ms, 42 languages, price $50 / 1M chars. Index likely rank #12–17.',
      },
      {
        value: 'smallest-ai:lightning',
        provider: 'smallest-ai',
        providerLabel: 'Smallest.ai',
        model: 'lightning',
        defaultVoiceId: 'emily',
        defaultVoiceName: 'Emily',
        label: 'Lightning v3.1',
        rank: '#18',
        likelyRank: '#18–20',
        humanness: 43,
        rating: null,
        votes: null,
        latencyMs: 420,
        languages: '12',
        price: '$15',
        description:
          'Smallest.ai Lightning v3.1. Rank #18, humanness 43, measured latency 420 ms, 12 languages, price $15 / 1M chars. Index likely rank #18–20.',
      },
      {
        value: 'eleven_turbo_v2_5',
        provider: '11labs',
        providerLabel: 'ElevenLabs',
        model: 'eleven_turbo_v2_5',
        label: 'Turbo v2.5',
        rank: '—',
        likelyRank: '—',
        humanness: 73,
        rating: null,
        votes: null,
        latencyMs: 265,
        languages: '32',
        price: '$50',
        description:
          'Retired from the arena. Turbo v2.5 arrived in July 2024 and extended ElevenLabs’ low latency tier from English to 32 languages. Humanness 73, measured latency 265 ms, 32 languages, price $50 / 1M chars.',
      },
    ],
  },
]

export function formatVapiTtsLatencyMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return `${Math.round(ms)} ms`
}

export function formatVapiTtsHumanness(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return '—'
  return String(Math.round(score))
}

export function formatVapiTtsVotes(votes) {
  if (typeof votes !== 'number' || !Number.isFinite(votes) || votes <= 0) return '—'
  return Math.round(votes).toLocaleString('en-US')
}

export function formatVapiTtsNaturalness(score) {
  return formatVapiTtsHumanness(score)
}

export const VAPI_TTS_OPTIONS = VAPI_TTS_OPTION_GROUPS.flatMap((group) =>
  group.options.map((opt) => ({
    ...opt,
    group: group.label,
    latency: formatVapiTtsLatencyMs(opt.latencyMs),
    humannessLabel: formatVapiTtsHumanness(opt.humanness),
    ratingLabel: formatVapiTtsHumanness(opt.rating),
    votesLabel: formatVapiTtsVotes(opt.votes),
    naturalness: opt.humanness,
    naturalnessLabel: formatVapiTtsHumanness(opt.humanness),
  })),
)

export const VAPI_ELEVENLABS_TTS_OPTION_GROUPS = VAPI_TTS_OPTION_GROUPS
export const VAPI_ELEVENLABS_TTS_OPTIONS = VAPI_TTS_OPTIONS
export const VAPI_ELEVENLABS_VOICE_MODEL_OPTIONS = VAPI_TTS_OPTIONS

export function getVapiTtsOption(modelId) {
  if (!modelId || typeof modelId !== 'string') return null
  const id = modelId.trim()
  if (!id) return null
  return VAPI_TTS_OPTIONS.find((opt) => opt.value === id) || null
}

export function vapiTtsKeepsPersonaVoice(modelId) {
  const opt = getVapiTtsOption(modelId)
  return !opt || opt.provider === '11labs'
}

export function vapiTtsLabel(modelId, fallback = DEFAULT_VAPI_ELEVENLABS_TTS_MODEL_ID) {
  const id = modelId || fallback
  return getVapiTtsOption(id)?.label || id
}

export function vapiTtsOptionsWithSaved(savedId) {
  const id = typeof savedId === 'string' ? savedId.trim() : ''
  if (id && !VAPI_TTS_OPTIONS.some((opt) => opt.value === id)) {
    return [
      {
        value: id,
        label: `${id} (saved)`,
        provider: '11labs',
        group: 'Currently saved',
        price: '—',
        rank: '—',
        likelyRank: '—',
        latencyMs: null,
        latency: '—',
        humanness: null,
        humannessLabel: '—',
        rating: null,
        ratingLabel: '—',
        votes: null,
        votesLabel: '—',
        naturalness: null,
        naturalnessLabel: '—',
        languages: '—',
        description: 'This persona is on a voice model that is no longer in the picker. Choose one below to switch.',
      },
      ...VAPI_TTS_OPTIONS,
    ]
  }
  return VAPI_TTS_OPTIONS
}

export const VAPI_ELEVENLABS_SPEED_MAX = 1.2
export const VAPI_ELEVENLABS_SPEED_MIN = 0.5

export function clampVapiElevenLabsSpeedForUi(value, fallback = 1) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(VAPI_ELEVENLABS_SPEED_MAX, Math.max(VAPI_ELEVENLABS_SPEED_MIN, n))
}

function intelligenceToQualityDots(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return 0
  return Math.max(1, Math.min(5, Math.round(score / 8)))
}

function intelligenceToQualityLabel(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return 'Unlisted'
  if (score >= 35) return 'Excellent'
  if (score >= 25) return 'Strong'
  if (score >= 18) return 'Good'
  if (score >= 12) return 'Fair'
  return 'Basic'
}

/** Round Vapi P50 ms the same way the dashboard displays (nearest 10). */
function vapiDisplayLatencyMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null
  return Math.round(ms / 10) * 10
}

/**
 * Vapi Model Intelligence $/min — same V3 formula as dashboard `cs()` + `ds()`:
 *   effectiveInput = cachedInput == null ? input : (input + cachedInput) / 2
 *   raw = ((promptChars + toolChars) / 4 * 5 * effectiveInput + 150 * output) / 1e6
 *   cost = max(modelFloor, max(0.01, raw))
 *
 * Rates/floors are from Vapi’s catalog (`costPer1MTokens` + `hn(true)`).
 * Baseline prompt+tool chars match a typical TruPulse calling assistant as the
 * Vapi dashboard counts them (system message hydrated into the prompt field +
 * `_s()` tool JSON). That is why GPT-5.6 Sol shows ~$0.107/min there — not the
 * tool-only floor.
 */
const VAPI_COST_BASELINE_PROMPT_CHARS = 30870
const VAPI_COST_BASELINE_TOOL_CHARS = 6948

/** Floors from Vapi `hn(true)` (V3 / Intelligence cards). */
function vapiModelCostFloor(modelId) {
  const id = modelId || ''
  if (id.includes('gpt-5-nano')) return 0.01
  if (id.includes('gpt-5-mini')) return 0.01
  if (id.includes('gpt-5.4-nano') || id.includes('gpt-5.4-mini') || id.includes('gpt-5.4')) return 0.01
  if (id.includes('4.1-nano') || id.includes('4.1-mini')) return 0.01
  if (id.includes('4.1')) return 0.02
  if (id.includes('gpt-realtime-mini')) return 0.06
  if (id.includes('gpt-realtime')) return 0.16
  if (id.includes('4o-realtime')) return 0.16
  if (id.includes('4o-mini-realtime')) return 0.04
  if (id.includes('4o-mini')) return 0.01
  if (id.includes('4o')) return 0.02
  if (id.includes('4')) return 0.04
  if (id.includes('3.5')) return 0.01
  if (id.includes('o1-mini')) return 0.02
  return 0.01
}

function estimateVapiModelCostPerMin(modelId, rates) {
  if (!rates || typeof rates.input !== 'number' || typeof rates.output !== 'number') return null
  const inputRate = rates.input
  const outputRate = rates.output
  const cached = typeof rates.cachedInput === 'number' ? rates.cachedInput : null
  const effectiveInput = cached == null ? inputRate : (inputRate + cached) / 2
  const raw =
    (((VAPI_COST_BASELINE_PROMPT_CHARS + VAPI_COST_BASELINE_TOOL_CHARS) / 4) * 5 * effectiveInput +
      150 * outputRate) /
    1e6
  return Math.max(vapiModelCostFloor(modelId), Math.max(0.01, raw))
}

/** Same display as Vapi Model Intelligence V3: `$` + toFixed(3) + `/min`. */
export function formatVapiLlmCostPerMin(cost) {
  if (typeof cost !== 'number' || !Number.isFinite(cost)) return '—'
  return `$${cost.toFixed(3)}/min`
}

/**
 * OpenAI models Vapi currently lists for assistant `model.model`.
 * `price` is Vapi’s estimated model $/min (not telephony, not OpenAI 1M-token list).
 * `latencyMs` / `intelligence` are from Vapi’s Model Intelligence catalog.
 * `gpt-realtime-2` is omitted — speech-to-speech, not a chat LLM.
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
        rates: { input: 4, output: 20, cachedInput: 0.4 },
        latencyMs: vapiDisplayLatencyMs(1057),
        intelligence: 42,
        supportsTemperature: false,
        description: 'Strongest 5.6 model. Best on messy objections and tool use. Too slow and expensive for everyday studio calls.',
      },
      {
        value: 'gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        badge: 'Checks details',
        badgeClass: 'bg-primary/10 text-primary',
        rates: { input: 2, output: 12, cachedInput: 0.2 },
        latencyMs: vapiDisplayLatencyMs(871),
        intelligence: 35,
        supportsTemperature: false,
        description: 'Newer model that thinks briefly before it speaks. Good if you want extra care on booking details without paying for Sol.',
      },
      {
        value: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        badge: 'Cheapest 5.6',
        badgeClass: 'bg-warning/10 text-warning',
        rates: { input: 0.2, output: 1.2, cachedInput: 0.02 },
        latencyMs: vapiDisplayLatencyMs(769),
        intelligence: 27,
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
        rates: { input: 5, output: 30, cachedInput: 0.5 },
        latencyMs: null,
        intelligence: 36,
        supportsTemperature: false,
        description: 'Premium flagship. Very capable, but costly for high-volume outbound calling. Vapi has not published a P50 latency for this model yet.',
      },
      {
        value: 'chat-latest',
        label: 'GPT Instant',
        badge: 'Latest Instant',
        badgeClass: 'bg-info/10 text-info',
        rates: { input: 5, output: 30, cachedInput: 0.5 },
        latencyMs: null,
        intelligence: null,
        supportsTemperature: true,
        description: 'Vapi’s GPT Instant (`chat-latest`). Fast ChatGPT-style replies. Price is high relative to 4.1 / 5.4 Mini. Vapi has not published latency/intelligence for this alias yet.',
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
        rates: { input: 2.5, output: 15, cachedInput: 0.25 },
        latencyMs: vapiDisplayLatencyMs(803),
        intelligence: 28,
        supportsTemperature: false,
        description: 'Strong newer flagship. Better than GPT-5 / 5.1 for hard conversations; a bit more latency than 4.1.',
      },
      {
        value: 'gpt-5.4-mini',
        label: 'GPT-5.4 Mini',
        badge: 'Recommended',
        badgeClass: 'bg-success/10 text-success',
        rates: { input: 0.75, output: 4.5, cachedInput: 0.075 },
        latencyMs: vapiDisplayLatencyMs(722),
        intelligence: 17,
        supportsTemperature: false,
        description: 'Best new mid-tier for live calls: clearly better than 4o Mini, much cheaper than full 5.4.',
      },
      {
        value: 'gpt-5.4-nano',
        label: 'GPT-5.4 Nano',
        badge: 'Budget',
        badgeClass: 'bg-warning/10 text-warning',
        rates: { input: 0.2, output: 1.25, cachedInput: 0.02 },
        latencyMs: vapiDisplayLatencyMs(1162),
        intelligence: 18,
        supportsTemperature: false,
        description: 'Cheap but higher latency than Mini on Vapi. Can sound scripted and miss context — not ideal as the main sales agent.',
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
        rates: { input: 1.75, output: 14, cachedInput: 0.175 },
        latencyMs: vapiDisplayLatencyMs(834),
        intelligence: 27,
        supportsTemperature: false,
        description: 'Previous-gen flagship. Solid instruction following with a short reasoning pause.',
      },
      {
        value: 'gpt-5.1',
        label: 'GPT-5.1',
        rates: { input: 1.25, output: 10, cachedInput: 0.125 },
        latencyMs: vapiDisplayLatencyMs(806),
        intelligence: 21,
        supportsTemperature: false,
        description: 'Same price as GPT-5 with slightly better behavior. 5.4 Mini is usually a better live-call pick now.',
      },
      {
        value: 'gpt-5',
        label: 'GPT-5',
        rates: { input: 1.25, output: 10, cachedInput: 0.125 },
        latencyMs: vapiDisplayLatencyMs(843),
        intelligence: 17,
        supportsTemperature: false,
        description: 'Original GPT-5. Still usable; prefer 5.1 or 5.4 Mini unless you are comparing.',
      },
      {
        value: 'gpt-5-mini',
        label: 'GPT-5 Mini',
        badge: 'Lower cost',
        badgeClass: 'bg-info/10 text-info',
        rates: { input: 0.25, output: 2, cachedInput: 0.025 },
        latencyMs: vapiDisplayLatencyMs(822),
        intelligence: 14,
        supportsTemperature: false,
        description: 'Inexpensive GPT-5-class model. Better than Nano; weaker than 4.1 on messy booking chats.',
      },
      {
        value: 'gpt-5-nano',
        label: 'GPT-5 Nano',
        badge: 'Cheapest',
        badgeClass: 'bg-warning/10 text-warning',
        rates: { input: 0.05, output: 0.4, cachedInput: 0.005 },
        latencyMs: vapiDisplayLatencyMs(712),
        intelligence: 8,
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
        rates: { input: 2, output: 8, cachedInput: 0.5 },
        latencyMs: vapiDisplayLatencyMs(687),
        intelligence: 20,
        supportsTemperature: true,
        description: 'Best everyday live-call model: follows the studio script, handles tools well, and answers immediately.',
      },
      {
        value: 'gpt-4.1-mini',
        label: 'GPT-4.1 Mini',
        badge: 'Fast & cheap',
        badgeClass: 'bg-info/10 text-info',
        rates: { input: 0.4, output: 1.6, cachedInput: 0.1 },
        latencyMs: vapiDisplayLatencyMs(600),
        intelligence: 15,
        supportsTemperature: true,
        description: 'Solid lower-cost option when the script is clear. Weaker when details conflict.',
      },
      {
        value: 'gpt-4o',
        label: 'GPT-4o',
        badge: 'Legacy',
        badgeClass: 'bg-muted text-muted-foreground',
        rates: { input: 2.5, output: 10, cachedInput: null },
        latencyMs: vapiDisplayLatencyMs(669),
        intelligence: 11,
        supportsTemperature: true,
        description: 'Kept for existing personas. GPT-4.1 is similar latency at a lower cost and usually follows the script better.',
      },
      {
        value: 'gpt-4o-mini',
        label: 'GPT-4o Mini',
        badge: 'Default',
        badgeClass: 'bg-muted text-muted-foreground',
        rates: { input: 0.15, output: 0.6, cachedInput: null },
        latencyMs: vapiDisplayLatencyMs(555),
        intelligence: 7,
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
        rates: { input: 2, output: 8, cachedInput: null },
        latencyMs: vapiDisplayLatencyMs(995),
        intelligence: 31,
        supportsTemperature: false,
        description: 'Deep reasoning model. High quality on hard tasks, but usually worse for natural phone conversation than 4.1 / 5.4 Mini.',
      },
    ],
  },
]

export function formatVapiLlmLatencyMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '—'
  return `${Math.round(ms).toLocaleString('en-US')} ms`
}

export function formatVapiLlmIntelligence(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return '—'
  return String(Math.round(score))
}

export const VAPI_LLM_OPTIONS = VAPI_LLM_OPTION_GROUPS.flatMap((group) =>
  group.options.map((opt) => {
    const costPerMin = estimateVapiModelCostPerMin(opt.value, opt.rates)
    return {
      ...opt,
      group: group.label,
      costPerMin,
      price: formatVapiLlmCostPerMin(costPerMin),
      latency: formatVapiLlmLatencyMs(opt.latencyMs),
      intelligenceLabel: formatVapiLlmIntelligence(opt.intelligence),
      quality: intelligenceToQualityDots(opt.intelligence),
      qualityLabel: intelligenceToQualityLabel(opt.intelligence),
    }
  }),
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
        price: '—',
        costPerMin: null,
        latencyMs: null,
        latency: '—',
        intelligence: null,
        intelligenceLabel: '—',
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
