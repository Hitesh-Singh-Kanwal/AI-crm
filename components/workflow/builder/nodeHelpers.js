import { getPaletteItem } from '@/components/workflow/builder/constants'

export function getNodeSummary(paletteType, config = {}) {
  switch (paletteType) {
    case 'form_submitted':
      return config.formName ? `Form: ${config.formName}` : 'When a form is submitted'
    case 'contact_created':
      return config.source ? `Source: ${config.source}` : 'When a new contact is created'
    case 'appointment_booked':
      return config.calendar ? `Calendar: ${config.calendar}` : 'When an appointment is booked'
    case 'tag_added':
      return config.tagName ? `Tag: ${config.tagName}` : 'When a tag is added'
    case 'send_email':
      return config.subject ? `Subject: ${config.subject}` : 'Send an email to the contact'
    case 'send_sms':
      return config.message || 'Send an SMS to the contact'
    case 'wait':
      return `Wait ${config.duration ?? 1} ${config.unit ?? 'days'}`
    case 'if_else':
      return `${humanizeField(config.field)} ${humanizeOperator(config.operator)} ${config.value || '…'}`
    case 'create_task':
      return config.title || 'Create a follow-up task'
    case 'ai_agent':
      return config.prompt || 'Run an AI agent step'
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
