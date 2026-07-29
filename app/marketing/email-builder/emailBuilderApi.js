/**
 * Normalizers for /api/email/builder and /api/emailHistory responses.
 */

import { getApiBaseUrl } from '@/lib/api'
import { getToken, getEffectiveBranch } from '@/lib/auth'

export function extractCategoriesList(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.categories)
    ? payload.categories
    : Array.isArray(payload)
    ? payload
    : []
  return Array.isArray(list) ? list : []
}

export function extractEmailTemplatesPayload(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.emails)
    ? payload.emails
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.emails)
    ? payload.data.emails
    : Array.isArray(payload)
    ? payload
    : []
  const pagination = payload?.pagination || payload?.data?.pagination || result?.pagination
  return {
    list: Array.isArray(list) ? list : [],
    total: pagination?.total ?? (Array.isArray(list) ? list.length : 0),
    totalPages: pagination?.totalPages ?? pagination?.pages,
  }
}

/** Used by StylePanel / form-builder / SMS — not email templates. */
export function extractLeadReasonsList(result) {
  const payload = result?.data
  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.reasons)
    ? payload.reasons
    : Array.isArray(payload?.data?.reasons)
    ? payload.data.reasons
    : []
  return Array.isArray(list) ? list : []
}

export function getTemplateCategoryId(template) {
  if (!template?.categoryID) return ''
  if (typeof template.categoryID === 'object') return template.categoryID._id || ''
  return String(template.categoryID)
}

export function getTemplateCategoryName(template) {
  if (!template?.categoryID) return null
  if (typeof template.categoryID === 'object') return template.categoryID.name || null
  return null
}

/**
 * Prefer the API origin only when developing against localhost.
 * In production, keep the backend's PUBLIC_API_BASE_URL so sent emails stay reachable.
 */
function normalizeUploadedMediaUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return raw
  try {
    const media = new URL(raw)
    if (!media.pathname.includes('/public/email-media/')) return raw
    const api = new URL(getApiBaseUrl())
    const isLocalApi =
      api.hostname === 'localhost' ||
      api.hostname === '127.0.0.1' ||
      api.hostname === '::1'
    if (!isLocalApi) return raw
    if (media.origin === api.origin) return raw
    return `${api.origin}${media.pathname}${media.search}`
  } catch {
    return raw
  }
}

/** Normalize pasted media/link URLs to absolute http(s). */
export function normalizeExternalMediaUrl(value) {
  let raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.startsWith('//')) raw = `https:${raw}`
  if (!/^https?:\/\//i.test(raw) && /^[\w.-]+\.[a-z]{2,}/i.test(raw)) {
    raw = `https://${raw}`
  }
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    return u.toString()
  } catch {
    return ''
  }
}

function mediaAuthHeaders({ json = false } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const branch = getEffectiveBranch()
  if (branch) headers['x-location-id'] = branch
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

/**
 * Upload an image for email HTML (multipart to /api/email/builder/media).
 * @param {File} file
 * @param {{ replaceUrl?: string }} [options] — previous managed media URL to delete after upload
 * @returns {{ success: boolean, url?: string, error?: string }}
 */
export async function uploadEmailMedia(file, options = {}) {
  if (!file) return { success: false, error: 'No file selected' }

  const form = new FormData()
  form.append('file', file)
  const replaceUrl = String(options?.replaceUrl || '').trim()
  if (replaceUrl) form.append('replaceUrl', replaceUrl)

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/email/builder/media`, {
      method: 'POST',
      headers: mediaAuthHeaders(),
      body: form,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.success) {
      return {
        success: false,
        error: data?.message || data?.error || `Upload failed (${response.status})`,
      }
    }
    const url = normalizeUploadedMediaUrl(data?.data?.url)
    if (!url) return { success: false, error: 'Upload succeeded but no URL was returned' }
    return { success: true, url, filename: data?.data?.filename }
  } catch (error) {
    return { success: false, error: error?.message || 'Network error' }
  }
}

/**
 * Delete a managed email-media image from S3 (no-op for external URLs).
 * @returns {{ success: boolean, deleted?: boolean, error?: string }}
 */
export async function deleteEmailMedia(url) {
  const target = String(url || '').trim()
  if (!target) return { success: true, deleted: false }
  if (!target.includes('/email-media/')) return { success: true, deleted: false }

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/email/builder/media`, {
      method: 'DELETE',
      headers: mediaAuthHeaders({ json: true }),
      body: JSON.stringify({ url: target }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.success) {
      return {
        success: false,
        error: data?.message || data?.error || `Delete failed (${response.status})`,
      }
    }
    return { success: true, deleted: Boolean(data?.data?.deleted) }
  } catch (error) {
    return { success: false, error: error?.message || 'Network error' }
  }
}

function escapeHtmlAttr(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Extract YouTube video id from common URL shapes. */
export function extractYoutubeId(url) {
  const raw = String(url || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace(/^\//, '').split('/')[0] || null
    }
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      const parts = u.pathname.split('/').filter(Boolean)
      const embedIdx = parts.indexOf('embed')
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1]
      const shortsIdx = parts.indexOf('shorts')
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1]
    }
  } catch {
    return null
  }
  return null
}

/** Extract Vimeo video id from common URL shapes. */
export function extractVimeoId(url) {
  const raw = String(url || '').trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (!u.hostname.includes('vimeo.com')) return null
    const parts = u.pathname.split('/').filter(Boolean)
    // vimeo.com/123456789 or vimeo.com/video/123456789
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (/^\d{6,}$/.test(parts[i])) return parts[i]
    }
  } catch {
    return null
  }
  return null
}

/**
 * Email-safe video block: clickable thumbnail + text link (clients strip <video>).
 */
export function buildVideoEmailHtml(videoUrl, posterUrl = '', style = '') {
  const href = normalizeExternalMediaUrl(videoUrl) || String(videoUrl || '').trim()
  const yt = extractYoutubeId(href)
  const vimeo = extractVimeoId(href)
  const poster =
    normalizeExternalMediaUrl(posterUrl) ||
    (yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : '') ||
    (vimeo ? `https://vumbnail.com/${vimeo}.jpg` : '')
  const safeHref = escapeHtmlAttr(href)
  const safePoster = escapeHtmlAttr(poster)
  const styleAttr = style ? ` style="${escapeHtmlAttr(style)}"` : ' style="text-align:center;margin:16px 0;"'

  if (safePoster) {
    return `<div${styleAttr}><a href="${safeHref}" target="_blank" rel="noopener noreferrer"><img src="${safePoster}" alt="Watch video" width="560" style="max-width:100%;height:auto;border:0;border-radius:8px;display:block;margin:0 auto;" /></a><p style="margin:8px 0 0;font-size:14px;"><a href="${safeHref}" target="_blank" rel="noopener noreferrer">▶ Watch video</a></p></div>`
  }

  return `<div${styleAttr}><a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 20px;background:#0f172a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">▶ Watch video</a></div>`
}
