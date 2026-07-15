import {
  buildConditionGroupsFromFlat,
  flattenConditionGroups,
  inferCatalogGroupId,
} from '@/lib/dynamic-list-normalize'
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
    additionalConditionLogic: 'AND',
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
    additionalConditionLogic: config.additionalConditionLogic === 'OR' ? 'OR' : 'AND',
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

export function splitContactConditionGroups(groups = [], audienceMode = '') {
  const rows = Array.isArray(groups) ? groups : []
  if (audienceMode === 'list') {
    return {
      baseGroups: rows.filter((g) => g.locked),
      additionalGroups: rows.filter((g) => !g.locked),
    }
  }
  // All contacts: scratch filters are the base condition.
  return {
    baseGroups: rows.filter((g) => !g.locked),
    additionalGroups: [],
  }
}

/** Normalize editor groups into API condition block. */
export function buildConditionBlock(groups = [], conditionLogic = 'AND') {
  const { conditions, groupLogics, conditionGroups } = flattenConditionGroups(groups || [])
  return {
    conditionLogic: conditionLogic === 'OR' ? 'OR' : 'AND',
    conditions,
    groupLogics,
    conditionGroups,
  }
}

export function isConditionBlockEmpty(block) {
  if (!block || typeof block !== 'object') return true
  const conditions = Array.isArray(block.conditions) ? block.conditions : []
  const groups = Array.isArray(block.conditionGroups) ? block.conditionGroups : []
  return conditions.length === 0 && groups.length === 0
}

/** Build contact audience fields for workflow create/update payload. */
export function buildContactAudiencePayload(config = {}) {
  const contact = getContactConfigFromTrigger(config)
  const { baseGroups, additionalGroups } = splitContactConditionGroups(
    contact.groups,
    contact.audienceMode
  )

  const baseCondition = buildConditionBlock(baseGroups, contact.conditionLogic)
  const additionalFilter = buildConditionBlock(
    additionalGroups,
    contact.additionalConditionLogic || contact.conditionLogic
  )

  return {
    entityType: contact.entityType,
    audienceMode: contact.audienceMode,
    listID: contact.audienceMode === 'list' ? contact.listID || null : null,
    listName: contact.audienceMode === 'list' ? contact.listName || '' : '',
    baseCondition,
    additionalFilter: isConditionBlockEmpty(additionalFilter) ? null : additionalFilter,
  }
}

export function validateContactAudienceForSave(config = {}) {
  const contact = getContactConfigFromTrigger(config)
  if (!contact.audienceMode) {
    return { ok: false, error: 'Choose who enters this workflow (All or a Dynamic list).' }
  }

  if (contact.audienceMode === 'list') {
    if (!contact.listID) {
      return { ok: false, error: 'Select a dynamic list for this trigger.' }
    }
    const { additionalGroups } = splitContactConditionGroups(contact.groups, 'list')
    if (additionalGroups.length > 0 && !contactGroupsAreValid(additionalGroups, contact.entityType)) {
      return { ok: false, error: 'Finish or remove incomplete additional filters before saving.' }
    }
    return { ok: true }
  }

  const { baseGroups } = splitContactConditionGroups(contact.groups, 'all')
  if (!contactGroupsAreValid(baseGroups, contact.entityType)) {
    return { ok: false, error: 'Add at least one complete base filter for “All” contacts.' }
  }
  return { ok: true }
}

/** Rebuild editor groups from saved workflow contact fields. */
export function hydrateContactGroupsFromAudience({
  audienceMode,
  entityType = 'lead',
  baseCondition,
  additionalFilter,
  listConditionSource,
} = {}) {
  const mode = audienceMode === 'list' ? 'list' : 'all'
  const baseSource = listConditionSource || baseCondition
  const baseGroups = buildConditionGroupsFromFlat({
    conditions: baseSource?.conditions,
    groupLogics: baseSource?.groupLogics,
    conditionGroups: baseSource?.conditionGroups,
    entityType,
  }).map((group) => ({
    ...group,
    locked: mode === 'list',
  }))

  const additionalGroups = buildConditionGroupsFromFlat({
    conditions: additionalFilter?.conditions,
    groupLogics: additionalFilter?.groupLogics,
    conditionGroups: additionalFilter?.conditionGroups,
    entityType,
  }).map((group) => ({
    ...group,
    locked: false,
  }))

  return {
    conditionLogic:
      baseSource?.conditionLogic === 'OR' || baseCondition?.conditionLogic === 'OR' ? 'OR' : 'AND',
    additionalConditionLogic: additionalFilter?.conditionLogic === 'OR' ? 'OR' : 'AND',
    groups: [...baseGroups, ...additionalGroups],
  }
}

/** Contact step is complete enough to move to Communication. */
export function isContactStepComplete(config = {}) {
  const contact = getContactConfigFromTrigger(config)
  if (!contact.entityType) return false
  if (contact.audienceMode !== 'all' && contact.audienceMode !== 'list') return false
  if (contact.audienceMode === 'list' && !contact.listID) return false
  // Filters are optional for list mode (list already segments). For "all", require at least one filter group.
  if (contact.audienceMode === 'all') {
    const base = (contact.groups || []).filter((g) => !g.locked)
    return contactGroupsAreValid(base, contact.entityType)
  }
  const additional = (contact.groups || []).filter((g) => !g.locked)
  if (additional.length === 0) return true
  return contactGroupsAreValid(additional, contact.entityType)
}

export function summarizeContactConfig(config = {}) {
  const contact = getContactConfigFromTrigger(config)
  const entityLabel = contact.entityType === 'customer' ? 'Customers' : 'Leads'
  if (!contact.audienceMode) return 'Choose who enters this workflow'
  if (contact.audienceMode === 'list') {
    const listPart = contact.listName || (contact.listID ? 'Selected list' : 'Pick a list')
    const { baseGroups, additionalGroups } = splitContactConditionGroups(
      contact.groups,
      'list'
    )
    const baseCount = baseGroups.reduce((sum, g) => sum + (g.conditions?.length || 0), 0)
    const extraCount = additionalGroups.reduce((sum, g) => sum + (g.conditions?.length || 0), 0)
    const parts = [`${entityLabel} · ${listPart}`]
    if (baseCount > 0) parts.push(`${baseCount} base`)
    if (extraCount > 0) parts.push(`${extraCount} additional`)
    return parts.join(' · ')
  }
  const filterCount = (contact.groups || []).reduce(
    (sum, g) => sum + (g.conditions?.length || 0),
    0
  )
  return filterCount > 0
    ? `${entityLabel} · All · ${filterCount} base filter${filterCount === 1 ? '' : 's'}`
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

