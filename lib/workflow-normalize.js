'use client'

/** Step types accepted by the workflow API. */
export const WORKFLOW_STEP_TYPES = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'aiCall', label: 'AI Call' },
  { value: 'humanCall', label: 'Human Call' },
]

export const WORKFLOW_EMAIL_TYPES = [
  { value: 'message', label: 'Plain text' },
  { value: 'template', label: 'HTML template' },
]

/** Hours 0–23 for step scheduling (local time on the selected day). */
export const WORKFLOW_HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, '0')}:00`,
}))

const VALID_STEP_TYPES = new Set(WORKFLOW_STEP_TYPES.map((t) => t.value))

/** Map legacy UI value and unknown types to API-safe values. */
export function normalizeStepTypeForApi(type) {
  const t = String(type ?? '').trim()
  if (t === 'call') return 'aiCall'
  if (VALID_STEP_TYPES.has(t)) return t
  return 'sms'
}

export function normalizeStepTypeFromApi(type) {
  return normalizeStepTypeForApi(type)
}

export function isCallStepType(type) {
  return type === 'call' || type === 'aiCall' || type === 'humanCall'
}

export function coerceWorkflowDay(day) {
  const n = day === 0 || day === '0' ? 0 : Number(day)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function coerceWorkflowHour(hour) {
  const n = hour === 0 || hour === '0' ? 0 : Number(hour)
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : 0
}

/**
 * Backend may return steps as:
 * - Step[] (flat)
 * - Step[][] (grouped)
 *
 * We normalize to Step[] for UI.
 */
export function flattenWorkflowSteps(steps) {
  if (!Array.isArray(steps)) return []
  if (steps.length === 0) return []

  const isGrouped = Array.isArray(steps[0])
  const flat = isGrouped ? steps.flat(1) : steps
  return flat.filter(Boolean)
}

export function normalizeWorkflowStepFromApi(step, idx = 0) {
  const type = normalizeStepTypeFromApi(step?.type)
  const base = {
    type,
    description: String(step?.description ?? ''),
    order: String(step?.order ?? String(idx + 1)),
    leadStage: String(step?.leadStage ?? 'new'),
    day: coerceWorkflowDay(step?.day),
    hour: coerceWorkflowHour(step?.hour),
  }

  if (type === 'email') {
    const emailType = step?.emailType === 'template' ? 'template' : 'message'
    return {
      ...base,
      emailType,
      script: String(step?.script ?? ''),
      htmlBody: String(step?.htmlBody ?? ''),
    }
  }

  if (type === 'sms') {
    return { ...base, script: String(step?.script ?? '') }
  }

  return base
}

export function normalizeWorkflowStepForApi(step) {
  const type = normalizeStepTypeForApi(step?.type)
  const orderNum = Number(step?.order)
  const base = {
    type,
    description: step?.description ?? '',
    order: Number.isFinite(orderNum) && orderNum > 0 ? orderNum : 1,
    leadStage: String(step?.leadStage ?? 'new'),
    day: coerceWorkflowDay(step?.day),
    hour: coerceWorkflowHour(step?.hour),
    knowledgeBaseIDes: Array.isArray(step?.knowledgeBaseIDes) ? step.knowledgeBaseIDes : [],
  }

  if (type === 'email') {
    const emailType = step?.emailType === 'template' ? 'template' : 'message'
    if (emailType === 'template') {
      return { ...base, emailType, htmlBody: String(step?.htmlBody ?? '') }
    }
    return { ...base, emailType, script: String(step?.script ?? '') }
  }

  if (type === 'sms') {
    return { ...base, script: String(step?.script ?? '') }
  }

  return base
}

/** API expects each step in its own inner array: Step[][]. */
export function groupWorkflowStepsForApi(flatSteps) {
  return flatSteps.map((s) => [normalizeWorkflowStepForApi(s)])
}

export function normalizeWorkflowFormIdFromApi(workflow) {
  const raw = workflow?.formID
  if (!raw) return ''
  if (typeof raw === 'object') return String(raw._id || raw.id || '')
  return String(raw)
}

export function normalizeWorkflowReasonFromApi(workflow) {
  return String(workflow?.reason ?? '')
}

export function normalizeWorkflowFromApi(workflow) {
  if (!workflow || typeof workflow !== 'object') return null

  const flatSteps = flattenWorkflowSteps(workflow.steps)
  const normalizedSteps = flatSteps.map((s, idx) => normalizeWorkflowStepFromApi(s, idx))

  return {
    ...workflow,
    formID: normalizeWorkflowFormIdFromApi(workflow),
    reason: normalizeWorkflowReasonFromApi(workflow),
    steps: normalizedSteps,
  }
}

export function normalizeWorkflowForPatch(workflow) {
  const steps = flattenWorkflowSteps(workflow?.steps)
  const payload = {
    name: String(workflow?.name ?? ''),
    description: String(workflow?.description ?? ''),
    event: String(workflow?.event ?? ''),
    steps: groupWorkflowStepsForApi(steps),
  }

  const formID = String(workflow?.formID ?? '').trim()
  const reason = String(workflow?.reason ?? '').trim()
  payload.formID = formID || null
  payload.reason = reason || null

  return payload
}

/** Form templates from GET /api/formBuilder */
export function extractFormTemplatesList(result) {
  const payload = result?.data
  return Array.isArray(payload) ? payload : []
}

/** Lead reasons from GET /api/lead-reasons (same shape as email builder). */
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

export function createEmptyWorkflowStep(order = 1) {
  return {
    type: 'sms',
    description: '',
    order: String(order),
    leadStage: 'new',
    day: 0,
    hour: 0,
    script: '',
    emailType: 'message',
    htmlBody: '',
  }
}
