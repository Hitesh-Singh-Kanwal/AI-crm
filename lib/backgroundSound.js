export const BUILTIN_BACKGROUND_SOUNDS = [
  { value: '', label: 'None' },
  { value: 'office', label: 'Office background' },
]

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
    return sound.vapiUrl.trim()
  }
  const playUrl = resolveBackgroundSoundPlayUrl(sound, apiBaseUrl)
  if (playUrl) return playUrl
  return typeof sound?.url === 'string' ? sound.url.trim() : ''
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
    return `${base}/public/background-sounds/${orgId}/${filename}`
  }

  return sound?.previewUrl || sound?.url || ''
}
