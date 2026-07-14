'use client'

import { cn } from '@/lib/utils'
import { WORKFLOW_BUILDER_STEPS } from '@/components/workflow/builder/constants'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'

/**
 * Lightweight step guide that keeps the existing canvas UI.
 * Clicking a step focuses the matching node / sidebar category.
 */
export default function WorkflowStepGuide({ activeCategory, onSelectCategory }) {
  const nodes = useWorkflowBuilderStore((s) => s.nodes)
  const setSelectedNodeId = useWorkflowBuilderStore((s) => s.setSelectedNodeId)
  const setPropertiesPanelCollapsed = useWorkflowBuilderStore((s) => s.setPropertiesPanelCollapsed)

  const focusStep = (step) => {
    onSelectCategory?.(step.paletteCategory)

    if (step.id === 'contact') {
      const trigger = nodes.find((n) => n.data?.category === 'trigger')
      if (trigger) {
        setSelectedNodeId(trigger.id)
        setPropertiesPanelCollapsed(false)
      }
      return
    }

    if (step.id === 'exit') {
      const exit = nodes.find(
        (n) => n.data?.paletteType === 'exit_logic' || n.data?.category === 'exit'
      )
      if (exit) {
        setSelectedNodeId(exit.id)
        setPropertiesPanelCollapsed(false)
      }
      return
    }

    // Action — select first action/wait/ai node if present
    const action = nodes.find((n) =>
      ['action', 'wait', 'ai'].includes(n.data?.category)
    )
    if (action) {
      setSelectedNodeId(action.id)
      setPropertiesPanelCollapsed(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-slate-200/80 bg-slate-50/80 px-4 py-2 dark:border-border dark:bg-muted/20">
      <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
        Steps
      </span>
      {WORKFLOW_BUILDER_STEPS.map((step, index) => {
        const active =
          activeCategory === step.paletteCategory ||
          (step.id === 'action' && activeCategory === 'actions')
        return (
          <div key={step.id} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span className="hidden text-muted-foreground sm:inline">→</span>
            ) : null}
            <button
              type="button"
              onClick={() => focusStep(step)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                active
                  ? 'bg-[var(--studio-primary)] text-white'
                  : 'bg-white text-muted-foreground hover:bg-slate-100 dark:bg-background dark:hover:bg-muted'
              )}
            >
              {index + 1}. {step.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}
