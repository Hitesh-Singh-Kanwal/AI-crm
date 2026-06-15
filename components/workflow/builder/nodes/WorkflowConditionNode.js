'use client'

import { Handle, Position } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NODE_STYLES } from '@/components/workflow/builder/constants'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'

const handleClass =
  '!h-3 !w-3 !border-2 !border-background !bg-[var(--studio-primary)]'

export default function WorkflowConditionNode({ id, data, selected }) {
  const selectedNodeId = useWorkflowBuilderStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useWorkflowBuilderStore((s) => s.setSelectedNodeId)
  const isSelected = selected || selectedNodeId === id
  const styles = NODE_STYLES.condition
  const config = data.config || {}

  const conditionLabel = `${config.field || 'field'} ${config.operator || 'equals'} ${config.value || '…'}`

  return (
    <div
      className={cn(
        'w-[260px] rounded-xl border-2 bg-card shadow-md transition-shadow',
        styles.accent,
        isSelected
          ? 'border-[var(--studio-primary)] shadow-lg ring-2 ring-[var(--studio-primary)]/20'
          : 'border-border/80'
      )}
      onClick={() => setSelectedNodeId(id)}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />

      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
            <GitBranch className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                styles.badge
              )}
            >
              {styles.badgeLabel}
            </span>
            <div className="mt-1 text-[13px] font-semibold leading-tight text-foreground">{data.label}</div>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{conditionLabel}</p>
          </div>
        </div>

        <div className="mt-3 flex justify-between px-1 text-[10px] font-semibold text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
          <span className="text-rose-600 dark:text-rose-400">No</span>
        </div>
      </div>

      <Handle
        id="yes"
        type="source"
        position={Position.Bottom}
        style={{ left: '28%' }}
        className="!h-3 !w-3 !border-2 !border-background !bg-emerald-500"
      />
      <Handle
        id="no"
        type="source"
        position={Position.Bottom}
        style={{ left: '72%' }}
        className="!h-3 !w-3 !border-2 !border-background !bg-rose-500"
      />
    </div>
  )
}
