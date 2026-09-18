'use client'

import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'
import {
  VAPI_TTS_OPTION_GROUPS,
  getVapiTtsOption,
  vapiTtsOptionsWithSaved,
} from '@/lib/vapiVoice'

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums text-foreground leading-snug">{value || '—'}</p>
    </div>
  )
}

function groupOptions(options) {
  const extra = []
  const groups = VAPI_TTS_OPTION_GROUPS.map((group) => ({
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

function optionLine(opt) {
  const bits = [opt.label]
  if (opt.humanness != null) bits.push(String(opt.humanness))
  if (opt.latency && opt.latency !== '—') bits.push(opt.latency)
  if (opt.price && opt.price !== '—') bits.push(opt.price)
  return bits.join(' · ')
}

export default function VapiTtsPicker({
  value,
  onChange,
  disabled = false,
  className,
}) {
  const resolvedValue = value || 'eleven_v3'
  const options = vapiTtsOptionsWithSaved(resolvedValue)
  const groups = groupOptions(options)
  const selected = getVapiTtsOption(resolvedValue) || options.find((opt) => opt.value === resolvedValue) || null
  const keepsClone = !selected || selected.provider === '11labs'

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
                {optionLine(opt)}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {selected && (
        <div className="rounded-lg border border-border/60 bg-background/80 px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">{selected.label}</p>
            {selected.providerLabel && (
              <span className="text-[11px] text-muted-foreground">{selected.providerLabel}</span>
            )}
            {selected.rank && selected.rank !== '—' && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                Rank {selected.rank}
              </span>
            )}
            {selected.likelyRank && selected.likelyRank !== '—' && (
              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Likely {selected.likelyRank}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Humanness" value={selected.humannessLabel} />
            <Stat label="Latency" value={selected.latency} />
            <Stat label="Price / 1M chars" value={selected.price} />
          </div>
          {!keepsClone && (
            <p className="text-[11px] leading-relaxed text-warning">
              Uses Vapi’s {selected.defaultVoiceName || 'stock'} voice ({selected.providerLabel}), not your ElevenLabs clone.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
