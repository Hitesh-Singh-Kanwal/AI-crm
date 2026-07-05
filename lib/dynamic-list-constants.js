export const CONDITION_FIELDS = [
  { value: 'stage', label: 'Stage' },
  { value: 'uploadType', label: 'Upload Type' },
  { value: 'source', label: 'Source' },
  { value: 'reason', label: 'Reason' },
]

export const CONDITION_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'ne', label: 'Not equals' },
  { value: 'in', label: 'In' },
]

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

export const STATUS_OPTIONS = ['active', 'inactive']

export const MEMBERS_PAGE_SIZE = 10
export const LISTS_PAGE_SIZE = 20
