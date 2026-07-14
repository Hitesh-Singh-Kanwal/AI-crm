import { getValidConditions } from '@/lib/customer-filter-fields'

export const EMPTY_CUSTOMER_FILTERS = {
  search: '',
  teacherID: '',
  conditionLogic: 'AND',
  conditions: [],
  groupLogics: {},
  enabledGroups: {},
}

export function sanitizeCustomerFilters(filters) {
  return {
    ...filters,
    search: filters?.search ?? '',
    teacherID: filters?.teacherID ?? '',
    conditionLogic: filters?.conditionLogic === 'OR' ? 'OR' : 'AND',
    conditions: Array.isArray(filters?.conditions) ? filters.conditions : [],
    groupLogics: filters?.groupLogics && typeof filters.groupLogics === 'object' ? filters.groupLogics : {},
    enabledGroups: filters?.enabledGroups && typeof filters.enabledGroups === 'object' ? filters.enabledGroups : {},
  }
}

export function hasActiveCustomerFilters(filters = {}) {
  if (String(filters?.search ?? '').trim()) return true
  if (String(filters?.teacherID ?? '').trim()) return true
  return getValidConditions(filters?.conditions).length > 0
}

export function countAdvancedCustomerFilters(filters = {}) {
  return getValidConditions(filters?.conditions).length
}
