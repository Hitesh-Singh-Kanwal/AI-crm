import { getPaletteItem } from '@/components/workflow/builder/constants'

const EVENT_LABELS = {
  non: 'Manual / no automatic trigger',
  form_submission: 'When a form is submitted',
  lead_updated: 'When a lead is updated',
  lead_moved_stage: 'When a lead changes stage',
  custom_event: 'On a custom event',
}

function triggerSummary(config) {
  if (config.triggerType === 'list' || config.listID) {
    const listLabel = config.listName || 'Dynamic list'
    const reasonLabel = config.reason ? config.reason : 'Default (any reason)'
    return `When lead enters list · ${listLabel} · ${reasonLabel}`
  }

  const eventLabel = EVENT_LABELS[config.event] || 'Choose what starts this workflow'
  if (config.event === 'form_submission') {
    if (config.isGenericForm) return `${eventLabel} · All forms`
    const count = Array.isArray(config.formID) ? config.formID.length : 0
    return count > 0 ? `${eventLabel} · ${count} form${count === 1 ? '' : 's'}` : `${eventLabel} · pick a form`
  }
  return eventLabel
}

function waitSummary(config) {
  const days = Number(config.days) || 0
  const hours = Number(config.hours) || 0
  const minutes = Number(config.minutes) || 0
  const parts = []
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours) parts.push(`${hours} hr`)
  if (minutes) parts.push(`${minutes} min`)
  return parts.length ? `Wait ${parts.join(' ')}` : 'No delay'
}

export function getNodeSummary(paletteType, config = {}) {
  switch (paletteType) {
    case 'form_submitted':
    case 'contact_created':
    case 'appointment_booked':
    case 'tag_added':
      return triggerSummary(config)
    case 'send_email':
      return config.subject ? `Subject: ${config.subject}` : 'Send an email'
    case 'send_sms':
      return config.message ? config.message : 'Send an SMS'
    case 'ai_agent':
      return config.prompt ? config.prompt : 'AI call to the lead'
    case 'wait':
      return waitSummary(config)
    case 'if_else':
      return `${humanizeField(config.field)} ${humanizeOperator(config.operator)} ${config.value || '…'}`
    case 'create_task':
      return config.title || 'Create a follow-up task'
    case 'ai_chatbot':
      return config.greeting || 'Start an AI chatbot conversation'
    case 'add_tag':
      return config.tagName ? `Add tag: ${config.tagName}` : 'Add a tag to the contact'
    case 'webhook':
      return config.url || 'Send data to an external URL'
    case 'goal':
      return config.name || 'Mark a conversion goal'
    default:
      return getPaletteItem(paletteType)?.description || ''
  }
}

function humanizeField(field) {
  const map = {
    lead_stage: 'Lead stage',
    email: 'Email',
    tag: 'Tag',
    form_submitted: 'Form submitted',
  }
  return map[field] || field || 'Field'
}

function humanizeOperator(op) {
  const map = {
    equals: 'is',
    not_equals: 'is not',
    contains: 'contains',
    is_empty: 'is empty',
  }
  return map[op] || op || 'is'
}

export const NODE_WIDTH = 300
export const NODE_GAP_Y = 100
