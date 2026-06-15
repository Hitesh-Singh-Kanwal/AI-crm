'use client'

import { ChevronLeft, ChevronRight, MousePointerClick, Settings2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CONDITION_FIELD_OPTIONS,
  CONDITION_OPERATOR_OPTIONS,
  EMAIL_TEMPLATE_OPTIONS,
  NODE_STYLES,
  WAIT_UNIT_OPTIONS,
  getPaletteItem,
} from '@/components/workflow/builder/constants'
import { getNodeSummary } from '@/components/workflow/builder/nodeHelpers'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

function Field({ label, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-[12px] font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  )
}

const inputClass =
  'h-9 rounded-lg border-border bg-background text-[13px] focus-visible:ring-[var(--studio-primary)]'

function EmailFields({ config, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Subject">
        <Input
          value={config.subject || ''}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Welcome to our studio"
          className={inputClass}
        />
      </Field>
      <Field label="From name">
        <Input
          value={config.fromName || ''}
          onChange={(e) => onChange({ fromName: e.target.value })}
          placeholder="Studio Team"
          className={inputClass}
        />
      </Field>
      <Field label="Email template">
        <select
          value={config.emailTemplate || 'welcome'}
          onChange={(e) => onChange({ emailTemplate: e.target.value })}
          className={cn(inputClass, 'w-full px-3 outline-none focus:border-[var(--studio-primary)]')}
        >
          {EMAIL_TEMPLATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

function SmsFields({ config, onChange }) {
  return (
    <Field label="SMS message">
      <Textarea
        value={config.message || ''}
        onChange={(e) => onChange({ message: e.target.value })}
        placeholder="Hi {{first_name}}, …"
        rows={5}
        className="resize-y rounded-lg border-border bg-background text-[13px]"
      />
    </Field>
  )
}

function WaitFields({ config, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Duration">
        <Input
          type="number"
          min={1}
          value={config.duration ?? 1}
          onChange={(e) => onChange({ duration: Number(e.target.value) || 1 })}
          className={inputClass}
        />
      </Field>
      <Field label="Unit">
        <select
          value={config.unit || 'days'}
          onChange={(e) => onChange({ unit: e.target.value })}
          className={cn(inputClass, 'w-full px-3 outline-none focus:border-[var(--studio-primary)]')}
        >
          {WAIT_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
    </div>
  )
}

function ConditionFields({ config, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Field">
        <select
          value={config.field || 'lead_stage'}
          onChange={(e) => onChange({ field: e.target.value })}
          className={cn(inputClass, 'w-full px-3 outline-none focus:border-[var(--studio-primary)]')}
        >
          {CONDITION_FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Operator">
        <select
          value={config.operator || 'equals'}
          onChange={(e) => onChange({ operator: e.target.value })}
          className={cn(inputClass, 'w-full px-3 outline-none focus:border-[var(--studio-primary)]')}
        >
          {CONDITION_OPERATOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Value">
        <Input
          value={config.value || ''}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="e.g. engaged"
          className={inputClass}
        />
      </Field>
    </div>
  )
}

function TaskFields({ config, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Task title">
        <Input
          value={config.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="Assignee">
        <Input
          value={config.assignee || ''}
          onChange={(e) => onChange({ assignee: e.target.value })}
          className={inputClass}
        />
      </Field>
    </div>
  )
}

function WebhookFields({ config, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Webhook URL">
        <Input
          value={config.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://..."
          className={inputClass}
        />
      </Field>
      <Field label="Method">
        <select
          value={config.method || 'POST'}
          onChange={(e) => onChange({ method: e.target.value })}
          className={cn(inputClass, 'w-full px-3 outline-none focus:border-[var(--studio-primary)]')}
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
          <option value="PUT">PUT</option>
        </select>
      </Field>
    </div>
  )
}

function AiFields({ config, onChange, paletteType }) {
  const isChatbot = paletteType === 'ai_chatbot'
  return (
    <Field label={isChatbot ? 'Greeting' : 'Agent prompt'}>
      <Textarea
        value={isChatbot ? config.greeting || '' : config.prompt || ''}
        onChange={(e) =>
          onChange(isChatbot ? { greeting: e.target.value } : { prompt: e.target.value })
        }
        rows={5}
        className="resize-y rounded-lg border-border bg-background text-[13px]"
      />
    </Field>
  )
}

function TagFields({ config, onChange }) {
  return (
    <Field label="Tag name">
      <Input
        value={config.tagName || ''}
        onChange={(e) => onChange({ tagName: e.target.value })}
        className={inputClass}
      />
    </Field>
  )
}

function NodeConfigFields({ paletteType, config, onChange }) {
  switch (paletteType) {
    case 'send_email':
      return <EmailFields config={config} onChange={onChange} />
    case 'send_sms':
      return <SmsFields config={config} onChange={onChange} />
    case 'wait':
      return <WaitFields config={config} onChange={onChange} />
    case 'if_else':
    case 'split':
      return <ConditionFields config={config} onChange={onChange} />
    case 'create_task':
      return <TaskFields config={config} onChange={onChange} />
    case 'webhook':
      return <WebhookFields config={config} onChange={onChange} />
    case 'add_tag':
    case 'tag_added':
      return <TagFields config={config} onChange={onChange} />
    case 'ai_agent':
    case 'ai_chatbot':
      return <AiFields config={config} onChange={onChange} paletteType={paletteType} />
    default:
      return (
        <p className="text-[12px] text-muted-foreground">
          This step uses default settings. Configuration is stored locally for this prototype.
        </p>
      )
  }
}

function CollapsedRail({ selectedNode, onExpand }) {
  const paletteItem = selectedNode ? getPaletteItem(selectedNode.data.paletteType) : null
  const Icon = paletteItem?.icon || Settings2
  const styles = selectedNode
    ? NODE_STYLES[selectedNode.data.category] || NODE_STYLES.action
    : null

  return (
    <div className="flex flex-1 flex-col items-center gap-2 py-3">
      <button
        type="button"
        onClick={onExpand}
        title="Open step settings"
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-muted-foreground shadow-sm hover:border-primary/40 hover:text-primary dark:border-border dark:bg-background',
          selectedNode && 'border-[var(--studio-primary)]/40 text-[var(--studio-primary)]'
        )}
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {selectedNode && Icon && (
        <button
          type="button"
          onClick={onExpand}
          title={`Edit: ${selectedNode.data.label}`}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm',
            styles?.iconBg,
            'border-transparent ring-2 ring-[var(--studio-primary)]/30'
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default function WorkflowBuilderPropertiesPanel() {
  const nodes = useWorkflowBuilderStore((s) => s.nodes)
  const selectedNodeId = useWorkflowBuilderStore((s) => s.selectedNodeId)
  const propertiesPanelCollapsed = useWorkflowBuilderStore((s) => s.propertiesPanelCollapsed)
  const setPropertiesPanelCollapsed = useWorkflowBuilderStore((s) => s.setPropertiesPanelCollapsed)
  const setSelectedNodeId = useWorkflowBuilderStore((s) => s.setSelectedNodeId)
  const updateNodeConfig = useWorkflowBuilderStore((s) => s.updateNodeConfig)
  const updateNodeLabel = useWorkflowBuilderStore((s) => s.updateNodeLabel)
  const deleteSelectedNode = useWorkflowBuilderStore((s) => s.deleteSelectedNode)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const expand = () => setPropertiesPanelCollapsed(false)

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-l border-slate-200/80 bg-slate-50/80 transition-all duration-200 dark:border-border dark:bg-muted/20',
        propertiesPanelCollapsed ? 'w-14' : 'w-[320px]'
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-3 dark:border-border">
        {!propertiesPanelCollapsed && (
          <div className="min-w-0">
            <h2 className="text-[14px] font-bold text-foreground">Step settings</h2>
            <p className="text-[11px] text-muted-foreground">Configure selected step</p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setPropertiesPanelCollapsed(!propertiesPanelCollapsed)}
          aria-label={propertiesPanelCollapsed ? 'Expand step settings' : 'Collapse step settings'}
        >
          {propertiesPanelCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {propertiesPanelCollapsed ? (
        <CollapsedRail selectedNode={selectedNode} onExpand={expand} />
      ) : !selectedNode ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-muted">
            <MousePointerClick className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">No step selected</p>
            <p className="mt-1 max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
              Click a step on the canvas to edit it here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-end border-b border-slate-100 px-3 py-2 dark:border-border">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedNodeId(null)}
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {(() => {
              const paletteItem = getPaletteItem(selectedNode.data.paletteType)
              const Icon = paletteItem?.icon
              const styles = NODE_STYLES[selectedNode.data.category] || NODE_STYLES.action

              return (
                <>
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
                    {Icon && (
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', styles.iconBg)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase', styles.badge)}>
                        {styles.badgeLabel}
                      </span>
                      <div className="mt-1 text-[14px] font-semibold text-foreground">{selectedNode.data.label}</div>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {getNodeSummary(selectedNode.data.paletteType, selectedNode.data.config)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <Field label="Step name">
                      <Input
                        value={selectedNode.data.label || ''}
                        onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                        className={inputClass}
                      />
                    </Field>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-background">
                      <h3 className="mb-4 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                        Settings
                      </h3>
                      <NodeConfigFields
                        paletteType={selectedNode.data.paletteType}
                        config={selectedNode.data.config || {}}
                        onChange={(partial) => updateNodeConfig(selectedNode.id, partial)}
                      />
                    </div>
                  </div>
                </>
              )
            })()}
          </div>

          <div className="border-t border-slate-100 p-4 dark:border-border">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={deleteSelectedNode}
            >
              Remove this step
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}
