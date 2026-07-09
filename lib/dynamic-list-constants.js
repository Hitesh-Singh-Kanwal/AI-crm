export const STAGE_OPTIONS = [
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

export const UPLOAD_TYPE_OPTIONS = [
  'manual',
  'bulk_upload',
  'form_submission',
  'incoming_sms',
  'incoming_email',
  'incoming_whatsapp',
  'incoming_call',
]

export const SOURCE_OPTIONS = ['google-add', 'website']

export const CONDITION_LOGIC_OPTIONS = ['AND', 'OR']

export const DYNAMIC_LIST_ENTITY_TYPES = ['lead', 'customer']

export const DYNAMIC_LIST_ENTITY_LABELS = {
  lead: 'Leads',
  customer: 'Customers',
}

export const STATUS_OPTIONS = ['active', 'inactive']

export const MEMBERS_PAGE_SIZE = 10
export const LISTS_PAGE_SIZE = 20

export { CONDITION_FIELDS, CONDITION_OPERATORS } from '@/lib/lead-filter-fields'
