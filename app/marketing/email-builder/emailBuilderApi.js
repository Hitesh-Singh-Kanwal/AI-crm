/**
 * Normalizers for /api/email/builder and /api/emailHistory responses.
 */

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

export function extractEmailHistoryList(result) {
  const payload = result?.data
  const list = Array.isArray(payload) ? payload : []
  return {
    list,
    total: result?.pagination?.total ?? list.length,
  }
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

export function aggregateEmailHistoryStats(records = []) {
  const stats = { sent: 0, opened: 0, clicked: 0, bounced: 0 }
  const bySubject = {}

  for (const row of records) {
    if (!row) continue
    stats.sent += 1
    const status = String(row.status || '').toLowerCase()
    if (status.includes('open')) stats.opened += 1
    if (status.includes('click')) stats.clicked += 1
    if (status.includes('bounce')) stats.bounced += 1

    const subject = String(row.subject || 'No subject').trim() || 'No subject'
    if (!bySubject[subject]) {
      bySubject[subject] = { subject, sent: 0, opened: 0, clicked: 0, bounced: 0 }
    }
    bySubject[subject].sent += 1
    if (status.includes('open')) bySubject[subject].opened += 1
    if (status.includes('click')) bySubject[subject].clicked += 1
    if (status.includes('bounce')) bySubject[subject].bounced += 1
  }

  const byTemplate = Object.values(bySubject).sort((a, b) => b.sent - a.sent)

  return { stats, byTemplate }
}
