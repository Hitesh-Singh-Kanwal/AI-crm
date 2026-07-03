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

export const VAPI_LLM_OPTIONS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-5',
  'gpt-5.1',
].map((id) => ({ value: id, label: id }))

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
