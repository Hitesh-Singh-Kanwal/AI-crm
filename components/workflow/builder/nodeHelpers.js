import { getPaletteItem } from '@/components/workflow/builder/constants'
import { summarizeContactConfig } from '@/lib/workflow-contact'

function triggerSummary(config) {
  return summarizeContactConfig(config)
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

function exitSummary(config) {
  if (config.exitType === 'goal') {
    return config.goalName ? `Exit on goal · ${config.goalName}` : 'Exit on goal'
  }
  if (config.exitType === 'leave_audience') return 'Exit when they leave the audience'
  return 'No exit rule'
}

export function getNodeSummary(paletteType, config = {}) {
  switch (paletteType) {
    case 'contact':
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
    case 'exit_logic':
      return exitSummary(config)
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
    equals: 'equals',
    not_equals: 'does not equal',
    contains: 'contains',
    is_empty: 'is empty',
  }
  return map[op] || op || ''
}

export const NODE_GAP_Y = 160
