import { inferCatalogGroupId } from '@/lib/dynamic-list-normalize'
import { isConditionComplete } from '@/components/shared/LeadConditionsEditor'

export const WORKFLOW_STEPS = [
  { id: 1, key: 'contact', label: 'Contact' },
  { id: 2, key: 'action', label: 'Action' },
  { id: 3, key: 'exit', label: 'Exit logic' },
]

export function createDefaultContactConfig(overrides = {}) {
  return {
    entityType: 'lead',
    audienceMode: '', // 'all' | 'list' — empty until user picks
    listID: '',
    listName: '',
    conditionLogic: 'AND',
    groups: [],
    reason: '',
    // legacy trigger fields kept in sync for save adapter
    triggerType: 'list',
    event: 'non',
    formID: [],
    isGenericForm: false,
    ...overrides,
  }
}

export function getContactConfigFromTrigger(config = {}) {
  const base = createDefaultContactConfig()
  return {
    ...base,
    ...config,
    entityType: config.entityType === 'customer' ? 'customer' : 'lead',
    audienceMode:
      config.audienceMode === 'all' || config.audienceMode === 'list'
        ? config.audienceMode
        : config.listID
          ? 'list'
          : '',
    listID: String(config.listID || ''),
    listName: String(config.listName || ''),
    conditionLogic: config.conditionLogic === 'OR' ? 'OR' : 'AND',
    groups: Array.isArray(config.groups) ? config.groups : [],
    reason: String(config.reason || ''),
  }
}

export function contactGroupsAreValid(groups = [], entityType = 'lead') {
  if (!Array.isArray(groups) || groups.length === 0) return false
  return groups.every((group) => {
    if (!inferCatalogGroupId(group, entityType)) return false
    return (
      Array.isArray(group.conditions) &&
      group.conditions.length > 0 &&
      group.conditions.every(isConditionComplete)
    )
  })
}

/** Contact step is complete enough to move to Communication. */
export function isContactStepComplete(config = {}) {
  const contact = getContactConfigFromTrigger(config)
  if (!contact.entityType) return false
  if (contact.audienceMode !== 'all' && contact.audienceMode !== 'list') return false
  if (contact.audienceMode === 'list' && !contact.listID) return false
  // Filters are optional for list mode (list already segments). For "all", require at least one filter group.
  if (contact.audienceMode === 'all') {
    return contactGroupsAreValid(contact.groups, contact.entityType)
  }
  return true
}

export function summarizeContactConfig(config = {}) {
  const contact = getContactConfigFromTrigger(config)
  const entityLabel = contact.entityType === 'customer' ? 'Customers' : 'Leads'
  if (!contact.audienceMode) return 'Choose who enters this workflow'
  if (contact.audienceMode === 'list') {
    const listPart = contact.listName || (contact.listID ? 'Selected list' : 'Pick a list')
    const filterCount = (contact.groups || []).reduce(
      (sum, g) => sum + (g.conditions?.length || 0),
      0
    )
    return filterCount > 0
      ? `${entityLabel} · ${listPart} · ${filterCount} filter${filterCount === 1 ? '' : 's'}`
      : `${entityLabel} · ${listPart}`
  }
  const filterCount = (contact.groups || []).reduce(
    (sum, g) => sum + (g.conditions?.length || 0),
    0
  )
  return filterCount > 0
    ? `${entityLabel} · All · ${filterCount} filter${filterCount === 1 ? '' : 's'}`
    : `${entityLabel} · All`
}

const CONTACT_NODE_TYPES = new Set([
  'contact',
  'form_submitted',
  'contact_created',
  'appointment_booked',
  'tag_added',
])

/** Activities that unlock Exit logic (at least one required). */
export const WORKFLOW_ACTIVITY_TYPES = new Set(['send_email', 'send_sms', 'ai_agent'])

export function getContactTriggerNode(nodes = []) {
  return (
    nodes.find((n) => n.data?.category === 'trigger') ||
    nodes.find((n) => CONTACT_NODE_TYPES.has(n.data?.paletteType)) ||
    null
  )
}

export function hasWorkflowActivity(nodes = []) {
  return nodes.some((n) => WORKFLOW_ACTIVITY_TYPES.has(n.data?.paletteType))
}

export function hasExitNode(nodes = []) {
  return nodes.some(
    (n) => n.data?.paletteType === 'exit_logic' || n.data?.category === 'exit'
  )
}

/**
 * Sequential unlock for Contact → Action → Exit.
 * Latches keep Action / Exit unlocked once earned (editing earlier steps won’t re-lock them).
 */
export function getWorkflowStepProgress(nodes = [], latches = {}) {
  const contactNode = getContactTriggerNode(nodes)
  const contactComplete = Boolean(
    contactNode && isContactStepComplete(contactNode.data?.config)
  )
  const actionComplete = hasWorkflowActivity(nodes)
  const exitPresent = hasExitNode(nodes)

  const actionsUnlocked = Boolean(latches.actionsUnlocked) || contactComplete
  const exitUnlocked =
    Boolean(latches.exitUnlocked) || (actionsUnlocked && actionComplete)

  return {
    contactNode,
    contactPresent: Boolean(contactNode),
    contactComplete,
    actionComplete,
    exitPresent,
    unlocked: {
      contact: true,
      actions: actionsUnlocked,
      exit: exitUnlocked,
    },
    /** Suggested next incomplete step (does not force navigation). */
    currentStep: !contactComplete ? 'contact' : !actionComplete ? 'action' : 'exit',
  }
}

/** Ratchet unlock flags up based on graph state; never clears once earned. */
export function nextWorkflowUnlockLatches(nodes = [], latches = {}) {
  const progress = getWorkflowStepProgress(nodes, latches)
  return {
    actionsUnlocked: Boolean(latches.actionsUnlocked) || progress.contactComplete,
    exitUnlocked:
      Boolean(latches.exitUnlocked) ||
      ((Boolean(latches.actionsUnlocked) || progress.contactComplete) && progress.actionComplete),
  }
}

export function isPaletteCategoryUnlocked(categoryId, progress) {
  if (categoryId === 'all') {
    return true
  }
  if (categoryId === 'contact') return progress.unlocked.contact
  if (categoryId === 'actions') return progress.unlocked.actions
  if (categoryId === 'exit') return progress.unlocked.exit
  return false
}

export function getPaletteUnlockMessage(categoryId, progress) {
  if (categoryId === 'actions' && !progress.unlocked.actions) {
    if (!progress.contactPresent) {
      return 'Add and set up Contact first.'
    }
    return 'Finish Contact (choose leads/customers and audience) before adding actions.'
  }
  if (categoryId === 'exit' && !progress.unlocked.exit) {
    if (!progress.unlocked.actions) {
      return 'Finish Contact and add an action before Exit logic.'
    }
    return 'Add at least one action (Email, SMS, or AI Call) before Exit logic.'
  }
  return ''
}

export function getCategoryIdForPaletteType(paletteType) {
  if (CONTACT_NODE_TYPES.has(paletteType) || paletteType === 'contact') return 'contact'
  if (paletteType === 'exit_logic') return 'exit'
  return 'actions'
}

