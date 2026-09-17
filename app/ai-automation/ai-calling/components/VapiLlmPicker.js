'use client'

import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import {
  VAPI_LLM_OPTION_GROUPS,
  getVapiLlmOption,
  vapiLlmOptionsWithSaved,
} from '@/lib/vapiVoice'

function QualityDots({ score = 0 }) {
  const filled = Math.max(0, Math.min(5, Number(score) || 0))
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i < filled ? 'bg-primary' : 'bg-muted-foreground/25',
          )}
        />
      ))}
    </span>
  )
}

function groupOptions(options) {
  const extra = []
  const groups = VAPI_LLM_OPTION_GROUPS.map((group) => ({
    label: group.label,
    options: options.filter((opt) => opt.group === group.label),
  })).filter((group) => group.options.length > 0)

  for (const opt of options) {
    if (!groups.some((group) => group.options.includes(opt))) extra.push(opt)
  }
  if (extra.length) {
    return [{ label: extra[0].group || 'Other', options: extra }, ...groups]
  }
  return groups
}

export default function VapiLlmPicker({
  value,
  onChange,
  disabled = false,
  className,
}) {
  const resolvedValue = value || 'gpt-4o-mini'
  const options = vapiLlmOptionsWithSaved(resolvedValue)
  const groups = groupOptions(options)
  const selected = getVapiLlmOption(resolvedValue) || options.find((opt) => opt.value === resolvedValue) || null

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={resolvedValue}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="h-9 px-2.5 text-xs"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
                {opt.price && opt.price !== '—' ? ` · ${opt.price}` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {selected && (
        <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">{selected.label}</p>
            {selected.badge && (
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', selected.badgeClass || 'bg-muted text-muted-foreground')}>
                {selected.badge}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="text-muted-foreground">$/min</p>
              <p className="font-medium tabular-nums text-foreground leading-snug">{selected.price || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Latency</p>
              <p className="font-medium tabular-nums text-foreground leading-snug">{selected.latency || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Intelligence</p>
              <p className="flex items-center gap-1.5 font-medium text-foreground leading-snug">
                <QualityDots score={selected.quality} />
                {selected.intelligenceLabel || '—'}
                {selected.qualityLabel && selected.qualityLabel !== 'Unlisted' ? ` · ${selected.qualityLabel}` : ''}
              </p>
            </div>
          </div>
          {selected.description && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{selected.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Latency, Intelligence, and $/min match Vapi’s Model Intelligence (P50 TTFT, score, and V3 cost formula with their costPer1MTokens + floors).
          </p>
        </div>
      )}
    </div>
  )
}
