'use client'

import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'
import { NODE_STYLES, getPaletteItem } from '@/components/workflow/builder/constants'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'

const handleClass =
  '!h-3 !w-3 !border-2 !border-background !bg-[var(--studio-primary)]'

function NodeSummary({ paletteType, config }) {
  if (paletteType === 'send_email' && config?.subject) {
    return <p className="mt-1 truncate text-[11px] text-muted-foreground">Subject: {config.subject}</p>
  }
  if (paletteType === 'send_sms' && config?.message) {
    return <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{config.message}</p>
  }
  if (paletteType === 'wait') {
    return (
      <p className="mt-1 text-[11px] text-muted-foreground">
        Wait {config?.days || 0}d {config?.hours || 0}h {config?.minutes || 0}m
      </p>
    )
  }
  if (paletteType === 'exit_logic') {
    const label =
      config?.exitType === 'goal'
        ? config?.goalName || 'Stop on goal'
        : config?.exitType === 'leave_audience'
          ? 'Leave audience'
          : 'No exit rule'
    return <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
  }
  if (paletteType === 'contact' || paletteType === 'contact_created' || paletteType === 'form_submitted') {
    if (config?.listName) {
      return <p className="mt-1 truncate text-[11px] text-muted-foreground">{config.listName}</p>
    }
    if (config?.audienceMode === 'all') {
      return (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          All {config?.entityType === 'customer' ? 'customers' : 'leads'}
        </p>
      )
    }
  }
  if (paletteType === 'create_task' && config?.title) {
    return <p className="mt-1 truncate text-[11px] text-muted-foreground">{config.title}</p>
  }
  if (paletteType === 'ai_agent' && config?.prompt) {
    return <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{config.prompt}</p>
  }
  return null
}

export default function WorkflowNode({ id, data, selected }) {
  const selectedNodeId = useWorkflowBuilderStore((s) => s.selectedNodeId)
  const setSelectedNodeId = useWorkflowBuilderStore((s) => s.setSelectedNodeId)
  const isSelected = selected || selectedNodeId === id

  const paletteItem = getPaletteItem(data.paletteType)
  const Icon = paletteItem?.icon
  const styles = NODE_STYLES[data.category] || NODE_STYLES.action
  const isTrigger = data.category === 'trigger'
  const isExit = data.category === 'exit' || data.paletteType === 'exit_logic'

  return (
    <div
      className={cn(
        'w-[240px] rounded-xl border-2 bg-card shadow-md transition-shadow',
        styles.accent,
        isSelected
          ? 'border-[var(--studio-primary)] shadow-lg ring-2 ring-[var(--studio-primary)]/20'
          : 'border-border/80'
      )}
      onClick={() => setSelectedNodeId(id)}
    >
      {!isTrigger && (
        <Handle type="target" position={Position.Top} className={handleClass} />
      )}

      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
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
            <NodeSummary paletteType={data.paletteType} config={data.config} />
          </div>
        </div>
      </div>

      {!isExit && <Handle type="source" position={Position.Bottom} className={handleClass} />}
    </div>
  )
}
