export const BUILTIN_BACKGROUND_SOUNDS = [
  { value: '', label: 'None' },
  { value: 'office', label: 'Office background' },
]

export const DEFAULT_BACKGROUND_SOUND_VOLUME = 0.4
export const MIN_BACKGROUND_SOUND_VOLUME = 0.05
export const MAX_BACKGROUND_SOUND_VOLUME = 1

export function clampBackgroundSoundVolume(value, fallback = DEFAULT_BACKGROUND_SOUND_VOLUME) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(MAX_BACKGROUND_SOUND_VOLUME, Math.max(MIN_BACKGROUND_SOUND_VOLUME, n))
}

export function formatBackgroundSoundVolumeLabel(volume) {
  return `${Math.round(clampBackgroundSoundVolume(volume) * 100)}%`
}

/** Append volume query param for our public background-sound URLs (Vapi fetches these). */
export function applyBackgroundSoundVolumeToUrl(url, volume) {
  const v = typeof url === 'string' ? url.trim() : ''
  if (!v || !/^https?:\/\//i.test(v)) return v
  if (volume === undefined || volume === null || volume === '') return v

  const vol = clampBackgroundSoundVolume(volume)
  if (vol >= MAX_BACKGROUND_SOUND_VOLUME - 0.001) return v

  try {
    const parsed = new URL(v)
    parsed.searchParams.delete('volume')
    parsed.searchParams.set('volume', vol.toFixed(2))
    return parsed.toString()
  } catch {
    return v
  }
}

export function formatBackgroundSoundLabel(value, customSounds = []) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v || v === 'off' || v === 'none') return 'None'
  if (v === 'office') return 'Office background'

  const match = customSounds.find((sound) => soundMatchesValue(sound, v))
  if (match?.name) return match.name
  if (/^https?:\/\//i.test(v)) return 'Custom sound'
  return 'None'
}

export function isVapiCallableBackgroundSoundUrl(value) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v || v === 'none' || v === 'off') return true
  if (v === 'office') return true
  if (!/^https:\/\//i.test(v)) return false
  try {
    const host = new URL(v).hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function resolveBackgroundSoundOptionValue(sound, apiBaseUrl) {
  if (typeof sound?.vapiUrl === 'string' && sound.vapiUrl.trim().startsWith('https://')) {
    return applyBackgroundSoundVolumeToUrl(sound.vapiUrl.trim(), sound?.volume)
  }
  const playUrl = resolveBackgroundSoundPlayUrl(sound, apiBaseUrl)
  if (playUrl) return applyBackgroundSoundVolumeToUrl(playUrl, sound?.volume)
  return applyBackgroundSoundVolumeToUrl(
    typeof sound?.url === 'string' ? sound.url.trim() : '',
    sound?.volume
  )
}

export function getSelectableBackgroundSounds(customSounds = [], apiBaseUrl) {
  return (Array.isArray(customSounds) ? customSounds : []).filter(
    (sound) => !!resolveBackgroundSoundOptionValue(sound, apiBaseUrl)
  )
}

export function soundMatchesValue(sound, value) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v || !sound) return false
  const candidates = [sound.vapiUrl, sound.url, sound.previewUrl].filter(Boolean)
  if (candidates.includes(v)) return true
  const orgId = sound?.organisationID?._id || sound?.organisationID
  if (orgId && sound.fileID && v.includes(`/public/background-sounds/${orgId}/${sound.fileID}`)) return true
  return false
}

export function resolveBackgroundSoundForSave(value) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v || v === 'none' || v === 'off') return null
  return v
}

export function normalizeBackgroundSoundSelection(value) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (!v || v === 'off' || v === 'none') return ''
  return v
}

/** Play URL for UI preview — always uses the current API host, not a stale stored URL. */
export function resolveBackgroundSoundPlayUrl(sound, apiBaseUrl) {
  const base = String(apiBaseUrl || '').replace(/\/$/, '')
  const orgId = sound?.organisationID?._id || sound?.organisationID
  const filename = sound?.fileID

  if (base && orgId && filename) {
    return applyBackgroundSoundVolumeToUrl(
      `${base}/public/background-sounds/${orgId}/${filename}`,
      sound?.volume
    )
  }

  return applyBackgroundSoundVolumeToUrl(sound?.previewUrl || sound?.url || '', sound?.volume)
}
