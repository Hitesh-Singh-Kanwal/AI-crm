'use client'

export { default as WorkflowNode } from '@/components/workflow/builder/nodes/WorkflowNode'
export { default as WorkflowConditionNode } from '@/components/workflow/builder/nodes/WorkflowConditionNode'

import WorkflowNode from '@/components/workflow/builder/nodes/WorkflowNode'
import WorkflowConditionNode from '@/components/workflow/builder/nodes/WorkflowConditionNode'

export const workflowNodeTypes = {
  workflowNode: WorkflowNode,
  workflowCondition: WorkflowConditionNode,
}
