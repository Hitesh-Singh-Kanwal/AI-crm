export const CAMPAIGN_EVENT_OPTIONS = ['non', 'form_submission', 'lead_updated', 'lead_moved_stage', 'custom_event']

export const CAMPAIGN_STATUS_OPTIONS = ['active', 'inactive']

export const CAMPAIGN_STEP_STATUS_OPTIONS = [
  'active',
  'inactive',
  'completed',
  'skipped',
  'failed',
  'scheduled',
]

export const CAMPAIGN_STEP_TYPES = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'aiCall', label: 'AI Call' },
  { value: 'humanCall', label: 'Human Call' },
  { value: 'call', label: 'Call' },
]

export const CAMPAIGN_LEAD_STAGE_OPTIONS = [
  'new',
  'engaged',
  'cold',
  'booked',
  'actualized',
  'no show',
  'qualified',
  'disqualified',
  'human intervention',
]

export function flattenCampaignSteps(steps) {
  if (!Array.isArray(steps)) return []
  const out = []
  for (const group of steps) {
    if (!Array.isArray(group)) continue
    for (const step of group) out.push({ ...step })
  }
  return out.sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))
}

function idOrNull(value) {
  if (value == null || value === '') return null
  if (typeof value === 'object') return value._id || value.id || null
  return String(value)
}

export function isoToDatetimeLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function datetimeLocalToIso(local) {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function stepToForm(step, fallbackOrder) {
  return {
    type: step?.type || 'sms',
    description: step?.description || '',
    script: step?.script || '',
    knowledgeBaseIDes: Array.isArray(step?.knowledgeBaseIDes) ? [...step.knowledgeBaseIDes] : [],
    order: String(step?.order ?? fallbackOrder),
    status: step?.status || 'scheduled',
    leadStage: step?.leadStage || 'new',
    scheduleDateAndTime: isoToDatetimeLocal(step?.scheduleDateAndTime),
  }
}

export function campaignToEditForm(campaign) {
  if (!campaign) return null
  const flat = flattenCampaignSteps(campaign.steps)
  return {
    _id: campaign._id || campaign.id,
    locationID: idOrNull(campaign.locationID),
    leadID: idOrNull(campaign.leadID) || '',
    name: campaign.name ?? '',
    description: campaign.description ?? '',
    status: campaign.status || 'active',
    isFavorite: !!campaign.isFavorite,
    event: campaign.event || 'non',
    steps: flat.length > 0 ? flat.map((s, i) => stepToForm(s, i + 1)) : [stepToForm({}, 1)],
  }
}

function buildStepPayload(step) {
  const order = Number(step.order)
  const payload = {
    type: step.type,
    description: step.description || '',
    script: step.script || '',
    knowledgeBaseIDes: Array.isArray(step.knowledgeBaseIDes) ? step.knowledgeBaseIDes : [],
    order: Number.isFinite(order) ? order : 1,
    status: step.status || 'scheduled',
    leadStage: step.leadStage || 'new',
  }
  const scheduled = datetimeLocalToIso(step.scheduleDateAndTime)
  if (scheduled) payload.scheduleDateAndTime = scheduled
  return payload
}

export function buildCampaignPatchPayload(form) {
  const sortedSteps = [...(form.steps || [])].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
  )
  return {
    locationID: form.locationID ?? null,
    leadID: form.leadID,
    name: String(form.name || '').trim(),
    description: form.description ?? '',
    status: form.status || 'active',
    isFavorite: !!form.isFavorite,
    event: form.event || 'non',
    steps: sortedSteps.map((step) => [buildStepPayload(step)]),
  }
}

export function createEmptyCampaignStep(order) {
  return stepToForm({}, order)
}
