/** Friendly module labels — keep in sync with backend activityLog.labels.js */
export const ACTIVITY_MODULE_LABELS = {
  lead: 'Leads',
  customer: 'Customers',
  lesson: 'Lessons',
  user: 'Users',
  role: 'Roles',
  location: 'Locations',
  form: 'Forms',
  emailCategory: 'Email',
  email: 'Email',
  emailHistory: 'Email',
  smsCategory: 'SMS',
  smsTemplate: 'SMS',
  smsHistory: 'SMS',
  sms: 'SMS',
  humanCall: 'Calls',
  aiPersona: 'AI Personas',
  aiAssistant: 'AI Assistants',
  aiScriptCategory: 'AI Scripts',
  aiScript: 'AI Scripts',
  CalendarEvent: 'Calendar',
  calendarService: 'Calendar',
  package: 'Packages',
  membership: 'Memberships',
  Enrollment: 'Enrollments',
  Payment: 'Payments',
  PaymentPlan: 'Payment Plans',
  tip: 'Tips',
  contract: 'Contracts',
  wallet: 'Wallet',
  aiCalling: 'AI Calling',
  workflow: 'Workflows',
  campaign: 'Campaigns',
  todo: 'Todos',
  document: 'Documents',
  introLesson: 'Intro Lessons',
  dynamicList: 'Dynamic Lists',
  leadStatus: 'Lead Statuses',
  leadStatusAutomation: 'Lead Automations',
  customerLifecycleAutomation: 'Customer Automations',
  organisation: 'Settings',
  aiSettings: 'AI Settings',
  followupSettings: 'Follow-up Settings',
  product: 'Products',
  eventType: 'Event Types',
  curriculum: 'Curriculum',
  goal: 'Goals',
  purchaseTemplate: 'Purchase Templates',
  purchase: 'Purchases',
  knowledgeBase: 'Knowledge Base',
  conversationalPlaybook: 'Playbooks',
  aiBackgroundSound: 'Background Sounds',
  inboundRoute: 'Inbound Routes',
  agreementTemplate: 'Agreements',
  agreementSession: 'Agreements',
  customerImport: 'Customer Import',
  inbox: 'Inbox',
  auth: 'Auth',
}

/** Module filter options — values are expanded to entity groups on the API. */
export const ACTIVITY_MODULE_FILTER_OPTIONS = [
  { value: 'All', label: 'All Modules' },
  { value: 'lead', label: 'Leads' },
  { value: 'customer', label: 'Customers' },
  { value: 'CalendarEvent', label: 'Calendar' },
  { value: 'introLesson', label: 'Intro Lessons' },
  { value: 'user', label: 'Users' },
  { value: 'location', label: 'Locations' },
  { value: 'workflow', label: 'Workflows' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'Payment', label: 'Payments' },
  { value: 'agreementTemplate', label: 'Agreements' },
  { value: 'aiCalling', label: 'AI Calling' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'todo', label: 'Todos' },
  { value: 'document', label: 'Documents' },
  { value: 'dynamicList', label: 'Dynamic Lists' },
]

/** Action / verb filter options shown in the What dropdown. */
export const ACTIVITY_ACTION_FILTER_OPTIONS = [
  { value: 'All', label: 'All Actions' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'booked', label: 'Booked' },
  { value: 'sent', label: 'Sent' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'charged', label: 'Charged' },
]

export function isValidActivityFilter(value, options) {
  return options.some((opt) => opt.value === value)
}

/**
 * Page buttons for the activity log: first five pages, current when outside that
 * set, and the last page. Ellipses fill gaps.
 * Example (page 8 of 20): 1 2 3 4 5 … 8 … 20
 */
export function buildActivityPageItems(currentPage, totalPages) {
  if (!totalPages || totalPages <= 1) return []
  const page = Math.min(Math.max(1, Number(currentPage) || 1), totalPages)
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => ({
      type: 'page',
      page: i + 1,
    }))
  }

  const pages = new Set([1, 2, 3, 4, 5, totalPages])
  if (page > 5 && page < totalPages) {
    pages.add(page)
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const items = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      items.push({ type: 'ellipsis', key: `e-${sorted[i - 1]}-${sorted[i]}` })
    }
    items.push({ type: 'page', page: sorted[i] })
  }
  return items
}

export function moduleLabel(entity) {
  if (!entity) return '—'
  return ACTIVITY_MODULE_LABELS[entity] || String(entity)
}

export function formatRoleLabel(role) {
  if (!role) return null
  const key = String(role).toLowerCase()
  if (key === 'superadmin' || key === 'super_admin') return 'Super Admin'
  if (key === 'admin') return 'Admin'
  if (key === 'staff') return 'Staff'
  if (key === 'agent') return 'AI Agent'
  if (key === 'system') return 'System'
  return String(role).charAt(0).toUpperCase() + String(role).slice(1)
}

/** Strip legacy ` - name (role)` suffix that older logActivity rows appended. */
export function cleanActivityDescription(description) {
  if (!description) return '—'
  return String(description)
    .replace(/\s*[-–]\s*[^(]+?\s*\([^)]+\)\s*$/, '')
    .trim() || '—'
}

/** Match backend humanizeStatus: new_lead → New Lead. */
export function humanizeStatusLabel(value) {
  if (!value) return null
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

const ID_CLAUSE_RE =
  /\s*\(\s*(?:formID|customerID|leadID|memberId|memberID|entityId|entityID|_?id)\s*:\s*[^)]+\)/gi
const BARE_OBJECT_ID_RE = /\b[a-f0-9]{24}\b/gi
const BRACKET_EMAIL_RE = /\[([^\s[\]]+@[^\s[\]]+)\]/g
const PAREN_RULE_RE = /\s*\(\s*rule\s*:\s*([^)]+)\)/i
const FROM_TO_RE =
  /\s+from\s+["']?(.+?)["']?\s+to\s+["']?(.+?)["']?(?=\s*(?:\(rule:|$))/i
const SNAKE_TOKEN_RE = /\b[a-z]+(?:_[a-z0-9]+)+\b/g

/**
 * Turn a stored activity description into a readable primary sentence plus an
 * optional muted secondary line (email, stage change, rule).
 */
export function formatActivityDetail(log) {
  const raw = cleanActivityDescription(
    log?.description || log?.message || log?.details || '',
  )
  if (!raw || raw === '—') return { primary: '—', secondary: null }

  const meta = log?.metadata && typeof log.metadata === 'object' ? log.metadata : {}
  const secondaryParts = []

  let text = raw
  const emails = []
  text = text.replace(BRACKET_EMAIL_RE, (_, email) => {
    emails.push(email)
    return ''
  })

  let ruleName = typeof meta.ruleName === 'string' ? meta.ruleName.trim() : ''
  const ruleMatch = text.match(PAREN_RULE_RE)
  if (ruleMatch) {
    if (!ruleName) ruleName = ruleMatch[1].trim()
    text = text.replace(PAREN_RULE_RE, '')
  }

  let fromLabel = humanizeStatusLabel(meta.fromStatus)
  let toLabel = humanizeStatusLabel(meta.toStatus)
  const fromToMatch = text.match(FROM_TO_RE)
  if (fromToMatch) {
    if (!fromLabel) fromLabel = humanizeStatusLabel(fromToMatch[1])
    if (!toLabel) toLabel = humanizeStatusLabel(fromToMatch[2])
    text = text.replace(FROM_TO_RE, '')
  }

  text = text
    .replace(ID_CLAUSE_RE, '')
    .replace(BARE_OBJECT_ID_RE, '')
    .replace(SNAKE_TOKEN_RE, (token) => token.replace(/_/g, ' '))
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim()

  // Drop trailing connectors left after stripping from/to or ids
  text = text.replace(/\s+(?:via|—|-|–)\s*$/i, '').trim()
  text = text.replace(/\s{2,}/g, ' ').trim()

  if (emails[0]) secondaryParts.push(emails[0])
  if (fromLabel && toLabel) secondaryParts.push(`${fromLabel} → ${toLabel}`)
  if (ruleName) secondaryParts.push(`Rule: ${ruleName}`)

  return {
    primary: text || '—',
    secondary: secondaryParts.length ? secondaryParts.join(' · ') : null,
  }
}

export function resolveActivityActor(log) {
  const doneBy = log?.doneBy || {}
  const desc = log?.description || ''
  const parsed = desc.match(/[-–]\s*([^(]+)\s*\(([^)]+)\)\s*$/)
  const name =
    doneBy.name ||
    log?.userName ||
    log?.user?.name ||
    (parsed ? parsed[1].trim() : null) ||
    null
  const role =
    doneBy.role ||
    log?.user?.role ||
    (parsed ? parsed[2].trim() : null) ||
    null
  return { name: name || '—', roleLabel: formatRoleLabel(role) }
}

export function resolveActivityVerb(log) {
  const fromMeta = log?.metadata?.verb
  if (fromMeta) return fromMeta
  const action = log?.action
  if (!action) return '—'
  return String(action).charAt(0).toUpperCase() + String(action).slice(1)
}

const VERB_BADGE_VARIANT = {
  created: 'success',
  booked: 'success',
  sent: 'info',
  scheduled: 'info',
  charged: 'info',
  updated: 'warning',
  deleted: 'error',
  default: 'secondary',
}

export function getVerbBadgeVariant(verb) {
  if (!verb) return 'secondary'
  const lower = String(verb).toLowerCase()
  for (const key of Object.keys(VERB_BADGE_VARIANT)) {
    if (lower.includes(key)) return VERB_BADGE_VARIANT[key]
  }
  return VERB_BADGE_VARIANT.default
}
