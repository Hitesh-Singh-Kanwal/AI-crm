import {
  Clock,
  Flag,
  Globe,
  ListTodo,
  Mail,
  MessageSquare,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react'
import { createDefaultContactConfig } from '@/lib/workflow-contact'

export const WORKFLOW_BUILDER_STEPS = [
  { id: 'contact', label: 'Contact', paletteCategory: 'contact' },
  { id: 'action', label: 'Action', paletteCategory: 'actions' },
  { id: 'exit', label: 'Exit logic', paletteCategory: 'exit' },
]

export const PALETTE_CATEGORIES = [
  {
    id: 'contact',
    label: 'Contact',
    items: [
      {
        type: 'contact',
        label: 'Contact',
        description: 'Choose leads or customers, then all or a dynamic list, and apply filters',
        icon: Users,
        category: 'trigger',
      },
    ],
  },
  {
    id: 'actions',
    label: 'Action',
    items: [
      {
        type: 'send_email',
        label: 'Send Email',
        description: 'Send a personalized email',
        icon: Mail,
        category: 'action',
      },
      {
        type: 'send_sms',
        label: 'Send SMS',
        description: 'Send a text message',
        icon: MessageSquare,
        category: 'action',
      },
      {
        type: 'ai_agent',
        label: 'AI Call',
        description: 'Let an AI agent call the lead',
        icon: Sparkles,
        category: 'ai',
      },
      {
        type: 'wait',
        label: 'Wait',
        description: 'Pause the automation for a set time',
        icon: Clock,
        category: 'wait',
      },
      {
        type: 'add_tag',
        label: 'Add Tag',
        description: 'Tag the contact for segmentation',
        icon: Tag,
        category: 'action',
      },
      {
        type: 'create_task',
        label: 'Create Task',
        description: 'Assign a task to your team',
        icon: ListTodo,
        category: 'action',
      },
      {
        type: 'webhook',
        label: 'Webhook',
        description: 'POST data to an external system',
        icon: Globe,
        category: 'action',
      },
    ],
  },
  {
    id: 'exit',
    label: 'Exit logic',
    items: [
      {
        type: 'exit_logic',
        label: 'Exit logic',
        description: 'Stop the workflow when a goal is met or the contact leaves the audience',
        icon: Flag,
        category: 'exit',
      },
    ],
  },
]

/** Kept for loading older workflows that used event-based trigger nodes. */
const LEGACY_PALETTE_ITEMS = [
  {
    type: 'form_submitted',
    label: 'Form Submitted',
    description: 'Start when someone submits a form',
    icon: Users,
    category: 'trigger',
  },
  {
    type: 'contact_created',
    label: 'Contact',
    description: 'Contact audience setup',
    icon: Users,
    category: 'trigger',
  },
  {
    type: 'appointment_booked',
    label: 'Appointment Booked',
    description: 'Start when a class or lesson is booked',
    icon: Flag,
    category: 'trigger',
  },
  {
    type: 'tag_added',
    label: 'Tag Added',
    description: 'Start when a specific tag is applied',
    icon: Tag,
    category: 'trigger',
  },
  {
    type: 'if_else',
    label: 'If / Else',
    description: 'Branch based on contact data',
    icon: Flag,
    category: 'condition',
  },
  {
    type: 'split',
    label: 'Split',
    description: 'Split contacts into multiple paths',
    icon: Flag,
    category: 'condition',
  },
  {
    type: 'goal',
    label: 'Goal',
    description: 'Mark when a contact reaches a goal',
    icon: Flag,
    category: 'action',
  },
]

export const NODE_STYLES = {
  trigger: {
    accent: 'border-emerald-500/40 bg-emerald-500/5',
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    badgeLabel: 'Contact',
  },
  action: {
    accent: 'border-border bg-card',
    iconBg: 'bg-primary/10 text-primary',
    badge: 'bg-muted text-muted-foreground',
    badgeLabel: 'Action',
  },
  wait: {
    accent: 'border-amber-500/40 bg-amber-500/5',
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    badgeLabel: 'Wait',
  },
  condition: {
    accent: 'border-blue-500/40 bg-blue-500/5',
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    badgeLabel: 'Logic',
  },
  ai: {
    accent: 'border-violet-500/40 bg-violet-500/5',
    iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    badgeLabel: 'AI',
  },
  exit: {
    accent: 'border-rose-500/40 bg-rose-500/5',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    badgeLabel: 'Exit',
  },
}

export {
  LEAD_STAGE_VALUES as LEAD_STAGE_OPTIONS,
  formatLeadStageLabel,
  getLeadStageOptions,
} from '@/lib/lead-stages'

const SCHEDULE_DEFAULTS = { description: '' }

const CONTACT_TRIGGER_DEFAULTS = {
  ...createDefaultContactConfig(),
  exitType: 'none',
}

export const DEFAULT_NODE_CONFIG = {
  contact: { ...CONTACT_TRIGGER_DEFAULTS },
  form_submitted: {
    ...CONTACT_TRIGGER_DEFAULTS,
    triggerType: 'event',
    event: 'form_submission',
    isGenericForm: true,
  },
  contact_created: { ...CONTACT_TRIGGER_DEFAULTS },
  appointment_booked: {
    ...CONTACT_TRIGGER_DEFAULTS,
    triggerType: 'event',
    event: 'custom_event',
  },
  tag_added: {
    ...CONTACT_TRIGGER_DEFAULTS,
    triggerType: 'event',
    event: 'lead_updated',
  },
  send_email: {
    ...SCHEDULE_DEFAULTS,
    emailType: 'message',
    subject: '',
    body: '',
    htmlBody: '',
    emailTemplateId: '',
    emailTemplateSubject: '',
  },
  send_sms: { ...SCHEDULE_DEFAULTS, message: '', smsTemplateId: '', smsTemplateName: '' },
  ai_agent: { ...SCHEDULE_DEFAULTS, prompt: '' },
  wait: { days: 1, hours: 0, minutes: 0 },
  add_tag: { tagName: '' },
  create_task: { title: '', assignee: 'Unassigned' },
  webhook: { url: '', method: 'POST' },
  if_else: { field: 'lead_stage', operator: 'equals', value: 'engaged' },
  split: { paths: 2 },
  goal: { name: 'Conversion goal' },
  ai_chatbot: { greeting: 'Hi! How can I help you today?' },
  exit_logic: {
    successGoalStages: [],
    exitRuleStages: [],
  },
}

/** Builder node types that map directly to a backend workflow step. */
export const BACKEND_STEP_NODES = new Set(['send_email', 'send_sms', 'ai_agent'])

/** Node types the backend can understand (trigger config, schedulable steps, wait offsets, exit). */
export const BACKEND_AWARE_NODES = new Set([
  'contact',
  'form_submitted',
  'contact_created',
  'appointment_booked',
  'tag_added',
  'send_email',
  'send_sms',
  'ai_agent',
  'wait',
  'exit_logic',
])

export function isBackendSupportedNode(paletteType) {
  return BACKEND_AWARE_NODES.has(paletteType)
}

export const EMAIL_TEMPLATE_OPTIONS = [
  { value: 'welcome', label: 'Welcome email' },
  { value: 'reminder', label: 'Appointment reminder' },
  { value: 'follow_up', label: 'Follow-up sequence' },
  { value: 'custom', label: 'Custom template' },
]

export const WAIT_UNIT_OPTIONS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
]

export const CONDITION_FIELD_OPTIONS = [
  { value: 'lead_stage', label: 'Lead stage' },
  { value: 'email', label: 'Email' },
  { value: 'tag', label: 'Tag' },
  { value: 'form_submitted', label: 'Form submitted' },
]

export const CONDITION_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'is_empty', label: 'Is empty' },
]

export function getPaletteItem(type) {
  for (const category of PALETTE_CATEGORIES) {
    const item = category.items.find((i) => i.type === type)
    if (item) return item
  }
  return LEGACY_PALETTE_ITEMS.find((i) => i.type === type) || null
}

export function getDefaultLabel(type) {
  return getPaletteItem(type)?.label || 'Step'
}

export function getDefaultConfig(type) {
  return { ...(DEFAULT_NODE_CONFIG[type] || {}) }
}
