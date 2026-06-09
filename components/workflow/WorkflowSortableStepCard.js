'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, Clock3, GripVertical, Mail, MessageSquare, Phone, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isCallStepType } from '@/lib/workflow-normalize'

function StepTypeIcon({ type, className }) {
  const Icon = isCallStepType(type) ? Phone : type === 'email' ? Mail : MessageSquare
  return <Icon className={className} />
}

function stepTypeLabel(type) {
  if (type === 'aiCall') return 'AI Call'
  if (type === 'humanCall') return 'Human Call'
  if (type === 'email') return 'Email'
  if (type === 'sms') return 'SMS'
  return String(type || 'Step')
}

function stepTypeBadgeClass(type) {
  if (type === 'email') return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
  if (type === 'sms') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (type === 'aiCall') return 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
  if (type === 'humanCall') return 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
  return 'bg-muted text-muted-foreground'
}

function formatStepTime(step) {
  const h = String(step.hour ?? 0).padStart(2, '0')
  const m = String(step.minute ?? 0).padStart(2, '0')
  return `${h}:${m}`
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getStepContentPreview(step) {
  if (step.type === 'email') {
    const subjectLine = step.subject?.trim()
    if (step.emailType === 'template') {
      if (subjectLine) return subjectLine
      if (step.emailTemplateSubject?.trim()) {
        return `Template: ${step.emailTemplateSubject}`
      }
      const text = stripHtml(step.htmlBody)
      return text || 'No template selected'
    }
    if (subjectLine) return subjectLine
    return step.script?.trim() || 'Plain text email (empty)'
  }
  if (step.type === 'sms') {
    if (step.smsContentType === 'template' && step.smsTemplateName?.trim()) {
      return `Template: ${step.smsTemplateName}`
    }
    return step.script?.trim() || 'SMS message not set'
  }
  if (isCallStepType(step.type)) {
    return step.description?.trim() || 'Outbound call — add a description'
  }
  return step.description?.trim() || ''
}

function getEmailFormatLabel(step) {
  if (step.type !== 'email') return null
  if (step.emailType === 'template') {
    if (step.subject?.trim()) return `Subject · ${step.subject}`
    return step.emailTemplateSubject?.trim()
      ? `Template · ${step.emailTemplateSubject}`
      : 'HTML template'
  }
  if (step.subject?.trim()) return `Subject · ${step.subject}`
  return 'Plain text'
}

function formatLeadStage(stage) {
  const s = String(stage || 'new').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function WorkflowSortableStepCard({
  id,
  step,
  stepNumber,
  day,
  isSelected,
  onSelect,
  showArrowAfter = false,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  const contentPreview = getStepContentPreview(step)
  const emailFormat = getEmailFormatLabel(step)
  const description = step.description?.trim() || ''

  return (
    <div ref={setNodeRef} style={style} className="flex shrink-0 items-stretch gap-2">
      <div
        className={cn(
          'flex w-[272px] shrink-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow',
          isDragging && 'opacity-90 shadow-lg ring-2 ring-primary/20',
          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/30 hover:shadow-md'
        )}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="flex w-8 shrink-0 cursor-grab touch-none items-center justify-center self-stretch border-r border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag step ${stepNumber}`}
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div
          role="button"
          tabIndex={0}
          onClick={onSelect}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect()
            }
          }}
          className="flex min-w-0 flex-1 cursor-pointer flex-col p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Step {stepNumber}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                stepTypeBadgeClass(step.type)
              )}
            >
              <StepTypeIcon type={step.type} className="h-3 w-3" />
              {stepTypeLabel(step.type)}
            </span>
          </div>

          {/* Type title */}
          <div className="mt-2 flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                isSelected ? 'bg-primary/15' : 'bg-muted'
              )}
            >
              <StepTypeIcon
                type={step.type}
                className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-foreground">{stepTypeLabel(step.type)}</div>
              {emailFormat && (
                <div className="mt-0.5 text-[10px] font-medium text-muted-foreground">{emailFormat}</div>
              )}
              {description && (
                <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{description}</div>
              )}
            </div>
          </div>

          {/* Meta chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground">
              <Clock3 className="h-3 w-3 text-muted-foreground" />
              Day {day ?? step.day ?? 0} · {formatStepTime(step)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-foreground">
              <Users className="h-3 w-3 text-muted-foreground" />
              {formatLeadStage(step.leadStage)}
            </span>
          </div>

          {/* Content preview */}
          <div className="mt-2.5 rounded-lg border border-border/80 bg-muted/25 px-2 py-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
              {step.type === 'sms' ? 'SMS preview' : step.type === 'email' ? 'Email preview' : 'Details'}
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-foreground/90">{contentPreview}</p>
          </div>

        </div>
      </div>

      {showArrowAfter && (
        <div className="flex w-5 shrink-0 items-center justify-center self-center text-muted-foreground/40" aria-hidden="true">
          <ChevronRight className="h-5 w-5" />
        </div>
      )}
    </div>
  )
}
