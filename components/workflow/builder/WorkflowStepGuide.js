'use client'

import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { WORKFLOW_BUILDER_STEPS } from '@/components/workflow/builder/constants'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import {
  getPaletteUnlockMessage,
  getWorkflowStepProgress,
  isPaletteCategoryUnlocked,
} from '@/lib/workflow-contact'

/**
 * Step guide that never forces navigation.
 * Locked steps stay locked until first unlock; after that users can switch freely.
 */
export default function WorkflowStepGuide({ activeCategory, onSelectCategory }) {
  const nodes = useWorkflowBuilderStore((s) => s.nodes)
  const actionsUnlocked = useWorkflowBuilderStore((s) => s.actionsUnlocked)
  const exitUnlocked = useWorkflowBuilderStore((s) => s.exitUnlocked)
  const setSelectedNodeId = useWorkflowBuilderStore((s) => s.setSelectedNodeId)
  const setPropertiesPanelCollapsed = useWorkflowBuilderStore((s) => s.setPropertiesPanelCollapsed)

  const progress = useMemo(
    () => getWorkflowStepProgress(nodes, { actionsUnlocked, exitUnlocked }),
    [actionsUnlocked, exitUnlocked, nodes]
  )

  const focusStep = (step) => {
    // Always allow browsing tabs; adding locked steps is still blocked in the sidebar.
    onSelectCategory?.(step.paletteCategory)

    const unlocked = isPaletteCategoryUnlocked(step.paletteCategory, progress)
    if (!unlocked) {
      toast.message(getPaletteUnlockMessage(step.paletteCategory, progress))
      return
    }

    if (step.id === 'contact') {
      const trigger = progress.contactNode
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

    const action = nodes.find((n) => ['action', 'wait', 'ai'].includes(n.data?.category))
    if (action) {
      setSelectedNodeId(action.id)
      setPropertiesPanelCollapsed(false)
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200/80 bg-slate-50/80 px-4 py-2 dark:border-border dark:bg-muted/20">
      <span className="mr-1 hidden text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
        Steps
      </span>
      {WORKFLOW_BUILDER_STEPS.map((step, index) => {
        const unlocked = isPaletteCategoryUnlocked(step.paletteCategory, progress)
        const active =
          activeCategory === step.paletteCategory ||
          (step.id === 'action' && activeCategory === 'actions')
        const done =
          (step.id === 'contact' && progress.contactComplete) ||
          (step.id === 'action' && progress.actionComplete) ||
          (step.id === 'exit' && progress.exitPresent)

        return (
          <div key={step.id} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span className="hidden text-muted-foreground sm:inline">→</span>
            ) : null}
            <button
              type="button"
              onClick={() => focusStep(step)}
              title={unlocked ? undefined : getPaletteUnlockMessage(step.paletteCategory, progress)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                active
                  ? 'bg-[var(--studio-primary)] text-white'
                  : unlocked
                    ? done
                      ? 'bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                      : 'bg-white text-muted-foreground hover:bg-slate-100 dark:bg-background dark:hover:bg-muted'
                    : 'cursor-not-allowed bg-white/70 text-muted-foreground/50 dark:bg-background/50'
              )}
            >
              {!unlocked ? <Lock className="h-3 w-3" /> : null}
              {index + 1}. {step.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}
