import {
  FORM_SUBMISSION_UPLOAD_TYPE,
  countAdvancedMemberFilters,
  uploadFiltersIncludeFormSubmission,
} from '@/lib/dynamic-list-member-filters'
import { flatFiltersToConditions } from '@/lib/lead-flat-filters'

export { SOURCE_OPTIONS, STAGE_OPTIONS, UPLOAD_TYPE_OPTIONS } from '@/lib/dynamic-list-constants'
export { MEMBER_BOOKING_STATUS_OPTIONS } from '@/lib/dynamic-list-member-filters'
export {
  countAdvancedMemberFilters as countAdvancedLeadFilters,
  getActiveMemberFilterChips as getActiveLeadFilterChips,
  hasActiveMemberFilters as hasActiveLeadFilters,
  removeFilterChip as removeLeadFilterChip,
  removeMemberFilterKeys as removeLeadFilterKeys,
} from '@/lib/dynamic-list-member-filters'

export const EMPTY_LEAD_FILTERS = {
  search: '',
  searchOperator: 'eq',
  conditionLogic: 'AND',
  conditions: [],
}

export { FORM_SUBMISSION_UPLOAD_TYPE, flatFiltersToConditions, uploadFiltersIncludeFormSubmission }

export function shouldShowSourceFilter(filters) {
  return uploadFiltersIncludeFormSubmission(filters)
}

export function shouldShowFormFilter(filters) {
  return shouldShowSourceFilter(filters)
}

export function sanitizeLeadFilters(filters) {
  return {
    ...filters,
    search: filters?.search ?? '',
    searchOperator: filters?.searchOperator || 'eq',
    conditionLogic: filters?.conditionLogic === 'OR' ? 'OR' : 'AND',
    conditions: Array.isArray(filters?.conditions) ? filters.conditions : [],
  }
}

export function countAdvancedLeadFilters(filters) {
  return countAdvancedMemberFilters(filters, null)
}
