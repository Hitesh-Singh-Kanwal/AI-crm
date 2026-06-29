'use client'

import { useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Mail,
  MessageSquare,
  MousePointerClick,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import WorkflowEmailTemplatePickerDialog from '@/components/workflow/WorkflowEmailTemplatePickerDialog'
import WorkflowSmsTemplatePickerDialog from '@/components/workflow/WorkflowSmsTemplatePickerDialog'
import {
  LEAD_STAGE_OPTIONS,
  NODE_STYLES,
  getPaletteItem,
  isBackendSupportedNode,
} from '@/components/workflow/builder/constants'
import { getNodeSummary } from '@/components/workflow/builder/nodeHelpers'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import { WORKFLOW_EVENT_OPTIONS, isWorkflowEventFormSubmission } from '@/lib/workflow-normalize'
import WorkflowFormMultiSelect from '@/components/workflow/WorkflowFormMultiSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Switch from '@/components/ui/switch'

function Field({ label, hint, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || hint) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && <Label className="text-[12px] font-semibold text-foreground">{label}</Label>}
          {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

const inputClass =
  'h-9 rounded-lg border-border bg-background text-[13px] focus-visible:ring-[var(--studio-primary)]'

const selectClass = cn(inputClass, 'w-full px-3 outline-none focus:border-[var(--studio-primary)]')

/** Polished template chooser used by Email + SMS steps. */
function TemplateSelector({ icon: Icon, name, onPick, onClear, hint }) {
  if (name) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--studio-primary)]/30 bg-[var(--studio-primary)]/[0.06] p-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--studio-primary)]/15 text-[var(--studio-primary)]">
          <Check className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--studio-primary)]">
            Template applied
          </p>
          <p className="truncate text-[13px] font-semibold text-foreground" title={name}>
            {name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onPick}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-2.5 text-left transition-all hover:border-[var(--studio-primary)]/50 hover:bg-[var(--studio-primary)]/[0.04]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-[var(--studio-primary)]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">Browse templates</p>
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--studio-primary)]" />
    </button>
  )
}

function ScheduleFields({ config, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="Lead stage">
        <select
          value={config.leadStage || 'new'}
          onChange={(e) => onChange({ leadStage: e.target.value })}
          className={selectClass}
        >
          {LEAD_STAGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>
      <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Timing is set by <span className="font-semibold text-foreground">Wait</span> steps placed before
          this one. Add a Wait step to delay it.
        </span>
      </div>
      <Field label="Internal note (optional)">
        <Input
          value={config.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Label for this step"
          className={inputClass}
        />
      </Field>
    </div>
  )
}

function TriggerFields({ config, onChange, options }) {
  const forms = options?.forms || []
  const reasons = options?.reasons || []
  const isFormSubmission = isWorkflowEventFormSubmission(config.event)

  return (
    <div className="space-y-4">
      <Field label="Trigger event">
        <select
          value={config.event || 'non'}
          onChange={(e) => {
            const next = e.target.value
            onChange(
              isWorkflowEventFormSubmission(next)
                ? { event: next }
                : { event: next, formID: [], isGenericForm: false, reason: '' }
            )
          }}
          className={selectClass}
        >
          {WORKFLOW_EVENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      {isFormSubmission && (
        <>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground">Apply to all forms</p>
              <p className="text-[11px] text-muted-foreground">Trigger on any form submission</p>
            </div>
            <Switch
              checked={Boolean(config.isGenericForm)}
              onCheckedChange={(checked) =>
                onChange({ isGenericForm: checked, ...(checked ? { formID: [] } : {}) })
              }
            />
          </div>

          {!config.isGenericForm && (
            <Field label="Forms">
              <WorkflowFormMultiSelect
                values={config.formID || []}
                onChange={(formID) => onChange({ formID })}
                forms={forms}
                compact
                placeholder="Select forms…"
              />
            </Field>
          )}

          <Field label="Reason (optional)">
            <select
              value={config.reason || ''}
              onChange={(e) => onChange({ reason: e.target.value })}
              className={selectClass}
            >
              <option value="">Any reason</option>
              {reasons.map((r) => {
                const value = r?.reasonCode || r?.name || ''
                return (
                  <option key={value || r?._id} value={value}>
                    {r?.name || value}
                  </option>
                )
              })}
            </select>
          </Field>
        </>
      )}
    </div>
  )
}

function EmailFields({ config, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const emailType = config.emailType === 'template' ? 'template' : 'message'
  return (
    <div className="space-y-4">
      <Field label="Start from a template" hint="optional">
        <TemplateSelector
          icon={Mail}
          hint="From your Email Builder"
          name={config.emailTemplateSubject || ''}
          onPick={() => setPickerOpen(true)}
          onClear={() =>
            onChange({ emailTemplateId: '', emailTemplateSubject: '', htmlBody: '', emailType: 'message' })
          }
        />
      </Field>

      <div className="h-px bg-border" />

      <Field label="Subject">
        <Input
          value={config.subject || ''}
          onChange={(e) => onChange({ subject: e.target.value })}
          placeholder="Welcome to our studio"
          className={inputClass}
        />
      </Field>
      <Field label="Email format">
        <select
          value={emailType}
          onChange={(e) => onChange({ emailType: e.target.value })}
          className={selectClass}
        >
          <option value="message">Plain text</option>
          <option value="template">HTML</option>
        </select>
      </Field>
      {emailType === 'template' ? (
        <Field label="HTML body">
          <Textarea
            value={config.htmlBody || ''}
            onChange={(e) => onChange({ htmlBody: e.target.value, emailTemplateId: '', emailTemplateSubject: '' })}
            placeholder="<p>Hi {{first_name}}…</p>"
            rows={6}
            className="resize-y rounded-lg border-border bg-background font-mono text-[12px]"
          />
        </Field>
      ) : (
        <Field label="Message">
          <Textarea
            value={config.body || ''}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Hi {{first_name}}, …"
            rows={5}
            className="resize-y rounded-lg border-border bg-background text-[13px]"
          />
        </Field>
      )}
      <ScheduleFields config={config} onChange={onChange} />

      <WorkflowEmailTemplatePickerDialog
        open={pickerOpen}
        selectedId={config.emailTemplateId || ''}
        onClose={() => setPickerOpen(false)}
        onSelect={({ emailTemplateId, emailTemplateSubject, subject, htmlBody }) =>
          onChange({
            emailType: 'template',
            emailTemplateId,
            emailTemplateSubject,
            subject: subject || config.subject || '',
            htmlBody,
          })
        }
      />
    </div>
  )
}

function SmsFields({ config, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  return (
    <div className="space-y-4">
      <Field label="Start from a template" hint="optional">
        <TemplateSelector
          icon={MessageSquare}
          hint="From your SMS Builder"
          name={config.smsTemplateName || ''}
          onPick={() => setPickerOpen(true)}
          onClear={() => onChange({ smsTemplateId: '', smsTemplateName: '' })}
        />
      </Field>

      <div className="h-px bg-border" />

      <Field label="SMS message">
        <Textarea
          value={config.message || ''}
          onChange={(e) => onChange({ message: e.target.value, smsTemplateId: '', smsTemplateName: '' })}
          placeholder="Hi {{first_name}}, …"
          rows={4}
          className="resize-y rounded-lg border-border bg-background text-[13px]"
        />
      </Field>
      <ScheduleFields config={config} onChange={onChange} />

      <WorkflowSmsTemplatePickerDialog
        open={pickerOpen}
        selectedId={config.smsTemplateId || ''}
        onClose={() => setPickerOpen(false)}
        onSelect={({ smsTemplateId, smsTemplateName, script }) =>
          onChange({ smsTemplateId, smsTemplateName, message: script })
        }
      />
    </div>
  )
}

function AiFields({ config, onChange }) {
  return (
    <div className="space-y-4">
      <Field label="AI call prompt">
        <Textarea
          value={config.prompt || ''}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="What should the AI do on this call?"
          rows={4}
          className="resize-y rounded-lg border-border bg-background text-[13px]"
        />
      </Field>
      <ScheduleFields config={config} onChange={onChange} />
    </div>
  )
}

function WaitFields({ config, onChange }) {
  const clamp = (v, max) => Math.min(max, Math.max(0, Number(v) || 0))
  return (
    <div className="space-y-3">
      <Field label="Wait for">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              value={config.days ?? 0}
              onChange={(e) => onChange({ days: Math.max(0, Number(e.target.value) || 0) })}
              className={inputClass}
            />
            <span className="block text-center text-[11px] text-muted-foreground">days</span>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              max={23}
              value={config.hours ?? 0}
              onChange={(e) => onChange({ hours: clamp(e.target.value, 23) })}
              className={inputClass}
            />
            <span className="block text-center text-[11px] text-muted-foreground">hours</span>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              max={59}
              value={config.minutes ?? 0}
              onChange={(e) => onChange({ minutes: clamp(e.target.value, 59) })}
              className={inputClass}
            />
            <span className="block text-center text-[11px] text-muted-foreground">minutes</span>
          </div>
        </div>
      </Field>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        All steps placed after this one run this much later (added on top of any earlier waits).
      </p>
    </div>
  )
}

function UnsupportedNote() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <span>This step is visual only. The current backend can’t store it, so it’s skipped when you save.</span>
    </div>
  )
}

function NodeConfigFields({ paletteType, category, config, onChange, options }) {
  if (category === 'trigger') {
    return <TriggerFields config={config} onChange={onChange} options={options} />
  }
  switch (paletteType) {
    case 'send_email':
      return <EmailFields config={config} onChange={onChange} />
    case 'send_sms':
      return <SmsFields config={config} onChange={onChange} />
    case 'ai_agent':
      return <AiFields config={config} onChange={onChange} />
    case 'wait':
      return <WaitFields config={config} onChange={onChange} />
    default:
      return <UnsupportedNote />
  }
}

function CollapsedRail({ selectedNode, onExpand }) {
  const paletteItem = selectedNode ? getPaletteItem(selectedNode.data.paletteType) : null
  const Icon = paletteItem?.icon
  const styles = selectedNode ? NODE_STYLES[selectedNode.data.category] || NODE_STYLES.action : null

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
            'flex h-9 w-9 items-center justify-center rounded-lg shadow-sm ring-2 ring-[var(--studio-primary)]/30',
            styles?.iconBg
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
  const options = useWorkflowBuilderStore((s) => s.options)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const expand = () => setPropertiesPanelCollapsed(false)

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-l border-slate-200/80 bg-slate-50/60 transition-all duration-200 dark:border-border dark:bg-muted/10',
        propertiesPanelCollapsed ? 'w-14' : 'w-[360px]'
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white/70 px-3 py-3 backdrop-blur dark:border-border dark:bg-card/40">
        {!propertiesPanelCollapsed && (
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]">
              <Settings2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[14px] font-bold leading-tight text-foreground">Step settings</h2>
              <p className="text-[11px] leading-tight text-muted-foreground">Configure selected step</p>
            </div>
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
          {propertiesPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {propertiesPanelCollapsed ? (
        <CollapsedRail selectedNode={selectedNode} onExpand={expand} />
      ) : !selectedNode ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--studio-primary)]/15 to-[var(--studio-primary)]/5 text-[var(--studio-primary)]">
            <MousePointerClick className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">No step selected</p>
            <p className="mx-auto mt-1 max-w-[220px] text-[12px] leading-relaxed text-muted-foreground">
              Click any step on the canvas to configure it, or drag a new step from the left panel.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4">
            {(() => {
              const paletteItem = getPaletteItem(selectedNode.data.paletteType)
              const Icon = paletteItem?.icon
              const styles = NODE_STYLES[selectedNode.data.category] || NODE_STYLES.action
              const supported = isBackendSupportedNode(selectedNode.data.paletteType)

              return (
                <>
                  <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/50 via-card to-card p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(null)}
                      title="Close"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-start gap-3 pr-7">
                      {Icon && (
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm', styles.iconBg)}>
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide', styles.badge)}>
                          {styles.badgeLabel}
                        </span>
                        <div className="mt-1.5 truncate text-[15px] font-bold text-foreground">{selectedNode.data.label}</div>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                          {getNodeSummary(selectedNode.data.paletteType, selectedNode.data.config)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Field label="Step name">
                      <Input
                        value={selectedNode.data.label || ''}
                        onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                        className={inputClass}
                      />
                    </Field>

                    {!supported && <UnsupportedNote />}

                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-background">
                      <div className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                        Configuration
                      </div>
                      <NodeConfigFields
                        paletteType={selectedNode.data.paletteType}
                        category={selectedNode.data.category}
                        config={selectedNode.data.config || {}}
                        onChange={(partial) => updateNodeConfig(selectedNode.id, partial)}
                        options={options}
                      />
                    </div>
                  </div>
                </>
              )
            })()}
          </div>

          <div className="border-t border-slate-100 bg-white/70 p-3 backdrop-blur dark:border-border dark:bg-card/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              onClick={deleteSelectedNode}
              disabled={selectedNode.data.category === 'trigger'}
              title={selectedNode.data.category === 'trigger' ? 'The trigger can’t be removed' : 'Remove this step'}
            >
              <X className="h-4 w-4" />
              {selectedNode.data.category === 'trigger' ? 'Trigger can’t be removed' : 'Remove this step'}
            </Button>
          </div>
        </>
      )}
    </aside>
  )
}
