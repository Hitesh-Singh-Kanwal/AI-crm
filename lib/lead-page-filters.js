import { FORM_SUBMISSION_UPLOAD_TYPE, countAdvancedMemberFilters } from '@/lib/dynamic-list-member-filters'
import {
  flatFilterHasValue,
  flatFiltersToConditions,
  getFlatFilterOperator,
  getFlatFilterValues,
} from '@/lib/lead-flat-filters'

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
  conditionLogic: 'AND',
  stage: '',
  stageOperator: 'eq',
  uploadType: '',
  uploadTypeOperator: 'eq',
  bookingStatus: '',
  bookingStatusOperator: 'eq',
  utm_source: '',
  sourceOperator: 'eq',
  reason: '',
  reasonOperator: 'eq',
  locationID: '',
  locationOperator: 'eq',
  formID: '',
  formOperator: 'eq',
  isEscalated: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
  relativeCreated: '',
  relativeCreatedDays: '',
  dateRangePreset: '',
}

export { FORM_SUBMISSION_UPLOAD_TYPE, flatFiltersToConditions }

export function shouldShowSourceFilter(filters) {
  if (filters?.uploadType === FORM_SUBMISSION_UPLOAD_TYPE) return true
  const operator = getFlatFilterOperator(filters, 'uploadTypeOperator')
  const uploadType = getFlatFilterValues(filters, 'uploadType', 'uploadTypeOperator')
  return operator === 'eq' && uploadType === FORM_SUBMISSION_UPLOAD_TYPE
}

export function shouldShowFormFilter(filters) {
  const operator = getFlatFilterOperator(filters, 'sourceOperator')
  const source = getFlatFilterValues(filters, 'utm_source', 'sourceOperator')
  if (flatFilterHasValue(source, operator)) return true
  return shouldShowSourceFilter(filters)
}

export function sanitizeLeadFilters(filters) {
  let next = { ...filters }
  if (!shouldShowSourceFilter(next)) {
    next.utm_source = ''
    next.sourceOperator = 'eq'
  }
  if (!shouldShowFormFilter(next)) {
    next.formID = ''
    next.formOperator = 'eq'
  }
  return next
}

export function countAdvancedLeadFilters(filters) {
  return countAdvancedMemberFilters(filters, null)
}
