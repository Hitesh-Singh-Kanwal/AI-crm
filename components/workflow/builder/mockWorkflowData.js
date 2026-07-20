import { getDefaultConfig, getDefaultLabel } from '@/components/workflow/builder/constants'
import { createDefaultContactConfig } from '@/lib/workflow-contact'

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
    makeNode('node-trigger', 'contact', 'trigger', CENTER_X, 20, {
      ...createDefaultContactConfig({
        audienceMode: 'all',
        entityType: 'lead',
      }),
    }),
    makeNode('node-email', 'send_email', 'action', CENTER_X, 200, {
      subject: 'Welcome to our studio!',
      emailType: 'message',
      body: 'Hi {{first_name}}, thanks for reaching out! We can’t wait to see you in class.',
    }),
    makeNode('node-wait-1', 'wait', 'wait', CENTER_X, 380, { days: 1, hours: 0, minutes: 0 }),
    makeNode('node-sms', 'send_sms', 'action', CENTER_X, 560, {
      message: 'Hi {{first_name}}, ready to book your first class?',
    }),
    makeNode('node-exit', 'exit_logic', 'exit', CENTER_X, 740, {
      successGoalStages: [],
      exitRuleStages: [],
    }),
  ]

  const edges = [
    { id: 'e-trigger-email', source: 'node-trigger', target: 'node-email', ...EDGE_STYLE },
    { id: 'e-email-wait1', source: 'node-email', target: 'node-wait-1', ...EDGE_STYLE },
    { id: 'e-wait1-sms', source: 'node-wait-1', target: 'node-sms', ...EDGE_STYLE },
    { id: 'e-sms-exit', source: 'node-sms', target: 'node-exit', ...EDGE_STYLE },
  ]

  return { nodes, edges, workflowName: DEMO_WORKFLOW_NAME }
}

/** A fresh empty canvas — user builds Contact → Action → Exit themselves. */
export function createBlankWorkflow() {
  return { nodes: [], edges: [], workflowName: 'Untitled automation' }
}
