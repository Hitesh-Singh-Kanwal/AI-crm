'use client'

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
  const normalizedSteps = flatSteps.map((s, idx) => ({
    type: String(s?.type ?? 'sms'),
    description: String(s?.description ?? ''),
    order: String(s?.order ?? String(idx + 1)),
    leadStage: String(s?.leadStage ?? 'new'),
    ...(s?.day !== undefined ? { day: s.day } : {}),
  }))

  return {
    ...workflow,
    steps: normalizedSteps,
  }
}

