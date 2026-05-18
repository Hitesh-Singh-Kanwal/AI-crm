/**
 * Helpers for POST /api/email/send-one (see Email Send One API documentation).
 */

const TEMPLATE_VAR_PATTERN = /\{\{([a-zA-Z0-9_]+)\}\}/g

export const EMAIL_TEMPLATE_VARIABLES = [
  { token: '{{name}}', description: 'Full name' },
  { token: '{{first_name}}', description: 'First name' },
  { token: '{{email}}', description: 'Email address' },
  { token: '{{phoneNumber}}', description: 'Phone number' },
  { token: '{{stage}}', description: 'Lead stage' },
  { token: '{{location}}', description: 'Location' },
  { token: '{{reason}}', description: 'Reason' },
  { token: '{{bookingStatus}}', description: 'Booking status' },
]

function firstNameFromName(name) {
  if (!name || typeof name !== 'string') return ''
  return name.trim().split(/\s+/)[0] || ''
}

/** Build template variable map from a lead/contact object. */
export function getEmailTemplateVariables(lead = {}) {
  const vars = {
    name: lead.name || '',
    first_name: firstNameFromName(lead.name),
    email: lead.email || '',
    phoneNumber: lead.phoneNumber || '',
    stage: lead.stage || '',
    location: lead.location || '',
    reason: lead.reason || '',
    bookingStatus: lead.bookingStatus || '',
  }

  const metadata = lead.metadata
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    for (const [key, value] of Object.entries(metadata)) {
      if (/^[a-zA-Z0-9_]+$/.test(key) && value != null) {
        vars[key] = String(value)
      }
    }
  }

  return vars
}

/** Replace {{variable}} tokens; unknown tokens are left unchanged. */
export function applyEmailTemplate(text, lead = {}) {
  if (!text) return ''
  const vars = getEmailTemplateVariables(lead)
  return String(text).replace(TEMPLATE_VAR_PATTERN, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key] ?? ''
    }
    return match
  })
}

/** Full lead object for send-one (organisationID is resolved server-side). */
export function buildLeadRecipient(contact = {}, leadData = null) {
  const lead = leadData || {}
  const id = lead._id || contact.id
  const email = (lead.email || contact.email || '').trim()
  const name = lead.name || contact.name || ''

  const recipient = {
    email,
    name: name || undefined,
  }

  if (id) recipient._id = id
  if (lead.stage || contact.stage) recipient.stage = lead.stage || contact.stage
  if (lead.phoneNumber || contact.phoneNumber) {
    recipient.phoneNumber = lead.phoneNumber || contact.phoneNumber
  }
  if (lead.location || contact.location) recipient.location = lead.location || contact.location
  if (lead.reason) recipient.reason = lead.reason
  if (lead.bookingStatus) recipient.bookingStatus = lead.bookingStatus
  if (lead.metadata && typeof lead.metadata === 'object') {
    recipient.metadata = lead.metadata
  }

  return recipient
}

/** Wrap plain text as simple HTML for email body. */
export function plainTextToHtml(text) {
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`
}

export function validateEmailSendInput({ lead, subject, content, scheduleNow, scheduleDate }) {
  if (!lead?.email) {
    return 'Lead with email is required'
  }
  if (!subject?.trim()) {
    return 'Subject is required'
  }
  if (!content?.trim()) {
    return 'Email html or text content is required'
  }
  if (scheduleNow === false) {
    if (!scheduleDate) {
      return 'scheduleDate is required when scheduleNow is false'
    }
    const when = new Date(scheduleDate)
    if (Number.isNaN(when.getTime())) {
      return 'scheduleDate must be a valid ISO datetime'
    }
    if (when.getTime() <= Date.now()) {
      return 'scheduleDate must be in the future'
    }
  }
  return null
}

/** Payload for POST /api/email/send-one (backend accepts `body` as HTML). */
export function buildSendOneEmailPayload({
  lead,
  subject,
  content,
  scheduleNow = true,
  scheduleDate = null,
}) {
  const html = plainTextToHtml(content.trim())
  const payload = {
    lead,
    subject: subject.trim(),
    html,
    body: html,
    scheduleNow,
  }
  if (scheduleNow === false && scheduleDate) {
    payload.scheduleDate = scheduleDate
  }
  return payload
}

/** Strip HTML tags for list previews and plain-text display. */
export function htmlToPlainText(html) {
  if (!html) return ''
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function mapEmailHistoryRecord(rec) {
  const lead = rec.leadID
  const email = rec.to || rec.email || lead?.email || ''
  const rawBody = rec.body || ''
  return {
    id: rec._id,
    sender: 'You',
    direction: 'outbound',
    content: htmlToPlainText(rawBody) || rawBody,
    contentHtml: rawBody,
    subject: rec.subject || '',
    timestamp: rec.sentAt || rec.scheduledAt || rec.createdAt,
    channel: 'Email',
    status: rec.status,
    recipientEmail: email,
  }
}

export function normalizeEmailAddress(email) {
  return String(email || '').trim().toLowerCase()
}

export function conversationKeyForEmailRecord(rec) {
  const lead = rec.leadID
  const email = rec.to || rec.email || lead?.email || ''
  if (lead?._id) return `lead-${lead._id}`
  if (email) return `email-${String(email).replace(/\W/g, '_')}`
  return null
}

/** Deduplicate thread messages by id. */
export function dedupeThreadMessages(messages) {
  const seen = new Set()
  return messages.filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

/** Index email history records by lead conv id and by recipient email. */
export function indexEmailHistoryRecords(emailRecords) {
  const byLeadId = {}
  const byEmail = {}

  for (const rec of emailRecords) {
    const mapped = mapEmailHistoryRecord(rec)
    const lead = rec.leadID
    const email = normalizeEmailAddress(rec.to || rec.email || lead?.email)

    if (lead?._id) {
      const key = `lead-${lead._id}`
      if (!byLeadId[key]) byLeadId[key] = []
      byLeadId[key].push(mapped)
    }
    if (email) {
      if (!byEmail[email]) byEmail[email] = []
      byEmail[email].push(mapped)
    }
  }

  for (const key of Object.keys(byLeadId)) {
    byLeadId[key] = dedupeThreadMessages(byLeadId[key]).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    )
  }
  for (const key of Object.keys(byEmail)) {
    byEmail[key] = dedupeThreadMessages(byEmail[key]).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    )
  }

  return { byLeadId, byEmail }
}

export function emailsForConversation(convId, contactEmail, index) {
  const { byLeadId, byEmail } = index
  const fromLead = convId.startsWith('lead-') ? byLeadId[convId] || [] : []
  const normalized = normalizeEmailAddress(contactEmail)
  const fromEmail = normalized ? byEmail[normalized] || [] : []
  return dedupeThreadMessages([...fromLead, ...fromEmail]).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  )
}
