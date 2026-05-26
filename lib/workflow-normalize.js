'use client'

/** Step types accepted by the workflow API. */
export const WORKFLOW_STEP_TYPES = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'aiCall', label: 'AI Call' },
  { value: 'humanCall', label: 'Human Call' },
]

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

  // If the first element is an array, assume Step[][] and flatten one level.
  const isGrouped = Array.isArray(steps[0])
  const flat = isGrouped ? steps.flat(1) : steps
  return flat.filter(Boolean)
}

export function normalizeWorkflowFromApi(workflow) {
  if (!workflow || typeof workflow !== 'object') return null

  const flatSteps = flattenWorkflowSteps(workflow.steps)
  const normalizedSteps = flatSteps.map((s, idx) => {
    const dayNum = Number(s?.day)
    return {
      type: normalizeStepTypeFromApi(s?.type),
      description: String(s?.description ?? ''),
      order: String(s?.order ?? String(idx + 1)),
      leadStage: String(s?.leadStage ?? 'new'),
      day: Number.isFinite(dayNum) ? dayNum : 0,
    }
  })

  return {
    ...workflow,
    steps: normalizedSteps,
  }
}

export function normalizeWorkflowForPatch(workflow) {
  const steps = flattenWorkflowSteps(workflow?.steps)
  return {
    name: String(workflow?.name ?? ''),
    description: String(workflow?.description ?? ''),
    event: String(workflow?.event ?? ''),
    steps: steps.map((s) => {
      const base = {
        type: normalizeStepTypeForApi(s?.type),
        description: s.description ?? '',
        order: String(s.order ?? ''),
        leadStage: String(s.leadStage ?? ''),
      }
      const dayNum = Number(s?.day)
      return { ...base, day: Number.isFinite(dayNum) ? dayNum : 0 }
    }),
  }
}
