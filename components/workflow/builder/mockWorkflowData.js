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

export const DEMO_WORKFLOW_NAME = 'New lead nurture automation'

export function createDemoWorkflow() {
  const nodes = [
    makeNode('node-trigger', 'form_submitted', 'trigger', CENTER_X, 20),
    makeNode('node-email', 'send_email', 'action', CENTER_X, 180, {
      subject: 'Welcome to our studio!',
      fromName: 'Studio Team',
      emailTemplate: 'welcome',
    }),
    makeNode('node-wait', 'wait', 'wait', CENTER_X, 340, { duration: 1, unit: 'days' }),
    makeNode('node-sms', 'send_sms', 'action', CENTER_X, 500, {
      message: 'Hi {{first_name}}, ready to book your first class?',
    }),
    makeNode('node-condition', 'if_else', 'condition', CENTER_X, 660, {
      field: 'lead_stage',
      operator: 'equals',
      value: 'engaged',
    }),
    makeNode('node-task', 'create_task', 'action', 80, 880, {
      title: 'Call lead — high intent',
      assignee: 'Sales team',
    }),
    makeNode('node-ai', 'ai_agent', 'ai', 600, 880, {
      prompt: 'Send a friendly re-engagement message and offer a trial class.',
    }),
  ]

  const edgeStyle = {
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    pathOptions: { borderRadius: 20 },
  }

  const edges = [
    { id: 'e-trigger-email', source: 'node-trigger', target: 'node-email', ...edgeStyle },
    { id: 'e-email-wait', source: 'node-email', target: 'node-wait', ...edgeStyle },
    { id: 'e-wait-sms', source: 'node-wait', target: 'node-sms', ...edgeStyle },
    { id: 'e-sms-condition', source: 'node-sms', target: 'node-condition', ...edgeStyle },
    {
      id: 'e-condition-yes',
      source: 'node-condition',
      sourceHandle: 'yes',
      target: 'node-task',
      label: 'Yes',
      labelStyle: { fill: '#059669', fontSize: 12, fontWeight: 700 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
      ...edgeStyle,
      style: { stroke: '#10b981', strokeWidth: 2 },
    },
    {
      id: 'e-condition-no',
      source: 'node-condition',
      sourceHandle: 'no',
      target: 'node-ai',
      label: 'No',
      labelStyle: { fill: '#e11d48', fontSize: 12, fontWeight: 700 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
      ...edgeStyle,
      style: { stroke: '#f43f5e', strokeWidth: 2 },
    },
  ]

  return { nodes, edges, workflowName: DEMO_WORKFLOW_NAME }
}
