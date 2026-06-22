import { getDefaultConfig, getDefaultLabel } from '@/components/workflow/builder/constants'

const CENTER_X = 360

function makeNode(id, type, category, x, y, configOverrides = {}) {
  return {
    id,
    type: category === 'condition' ? 'workflowCondition' : 'workflowNode',
    position: { x, y },
    data: {
      paletteType: type,
      category,
      label: getDefaultLabel(type),
      config: { ...getDefaultConfig(type), ...configOverrides },
    },
  }
}

const EDGE_STYLE = {
  type: 'smoothstep',
  style: { stroke: '#94a3b8', strokeWidth: 2 },
  pathOptions: { borderRadius: 20 },
}

export const DEMO_WORKFLOW_NAME = 'New lead nurture automation'

export function createDemoWorkflow() {
  const nodes = [
    makeNode('node-trigger', 'form_submitted', 'trigger', CENTER_X, 20, {
      event: 'form_submission',
      isGenericForm: true,
      formID: [],
      reason: '',
    }),
    makeNode('node-email', 'send_email', 'action', CENTER_X, 200, {
      subject: 'Welcome to our studio!',
      emailType: 'message',
      body: 'Hi {{first_name}}, thanks for reaching out! We can’t wait to see you in class.',
      leadStage: 'new',
    }),
    makeNode('node-wait-1', 'wait', 'wait', CENTER_X, 380, { days: 1, hours: 0, minutes: 0 }),
    makeNode('node-sms', 'send_sms', 'action', CENTER_X, 560, {
      message: 'Hi {{first_name}}, ready to book your first class?',
      leadStage: 'engaged',
    }),
    makeNode('node-wait-2', 'wait', 'wait', CENTER_X, 740, { days: 1, hours: 0, minutes: 0 }),
    makeNode('node-ai', 'ai_agent', 'ai', CENTER_X, 920, {
      prompt: 'Call the lead, answer questions, and help them book a trial class.',
      leadStage: 'engaged',
    }),
  ]

  const edges = [
    { id: 'e-trigger-email', source: 'node-trigger', target: 'node-email', ...EDGE_STYLE },
    { id: 'e-email-wait1', source: 'node-email', target: 'node-wait-1', ...EDGE_STYLE },
    { id: 'e-wait1-sms', source: 'node-wait-1', target: 'node-sms', ...EDGE_STYLE },
    { id: 'e-sms-wait2', source: 'node-sms', target: 'node-wait-2', ...EDGE_STYLE },
    { id: 'e-wait2-ai', source: 'node-wait-2', target: 'node-ai', ...EDGE_STYLE },
  ]

  return { nodes, edges, workflowName: DEMO_WORKFLOW_NAME }
}

/** A fresh canvas with only a trigger, used when creating a brand-new workflow. */
export function createBlankWorkflow() {
  const nodes = [
    makeNode('node-trigger', 'form_submitted', 'trigger', CENTER_X, 40, {
      event: 'form_submission',
      isGenericForm: true,
      formID: [],
      reason: '',
    }),
  ]
  return { nodes, edges: [], workflowName: 'Untitled automation' }
}
