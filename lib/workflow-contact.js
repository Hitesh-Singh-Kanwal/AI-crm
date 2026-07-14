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
