'use client'

import { cn } from '@/lib/utils'
import { Card, WidgetTitleRow, EmptyChart } from './shared'

function formatTokens(n) {
  const num = Number(n) || 0
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

// Token bills are tiny — keep cents visible instead of rounding $0.04 to $0.
function formatUsd(n) {
  const num = Number(n) || 0
  if (num > 0 && num < 0.01) return '<$0.01'
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function BasisTag({ basis }) {
  const recorded = basis === 'recorded'
  return (
    <span
      title={
        recorded
          ? 'Token counts recorded by the provider for each call'
          : 'No token counts are stored for this channel — modelled from the messages sent'
      }
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        recorded ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
      )}
    >
      {recorded ? 'Recorded' : 'Estimated'}
    </span>
  )
}

/**
 * Tokens the AI used in the period and their approximate dollar value (list
 * prices, not provider invoices). Voice-call tokens are recorded exactly; the
 * SMS agent's are estimated, and every estimated row says so.
 */
export default function AiTokenUsageWidget({ aiTokenUsage }) {
  const usage = aiTokenUsage
  const hasData = usage && usage.totalTokens > 0
  const assumed = (usage?.byModel || []).some((m) => m.priceAssumed)

  return (
    <Card>
      <WidgetTitleRow title="AI Token Usage" />
      {hasData ? (
        <>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div>
              <p className="text-[12px] font-medium text-muted-foreground">Approx. dollar value</p>
              <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight tabular-nums text-foreground sm:text-[32px]">
                ≈ {formatUsd(usage.costUsd)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatUsd(usage.recordedCostUsd)} recorded · {formatUsd(usage.estimatedCostUsd)} estimated
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-muted-foreground">Tokens used</p>
              <p className="mt-1 text-[22px] font-bold leading-tight tabular-nums text-foreground sm:text-[26px]">
                {formatTokens(usage.totalTokens)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatTokens(usage.inputTokens)} in · {formatTokens(usage.outputTokens)} out
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[420px] divide-y divide-border">
              <div className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] gap-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Source</span>
                <span>Tokens</span>
                <span>Value</span>
                <span>Basis</span>
              </div>
              {usage.channels.map((c) => (
                <div key={c.channel} className="grid grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr] items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{c.channel}</p>
                    <p className="text-[11px] text-muted-foreground">{c.uses.toLocaleString()} calls</p>
                  </div>
                  <span className="tabular-nums text-muted-foreground">{formatTokens(c.totalTokens)}</span>
                  <span className="tabular-nums text-foreground">{formatUsd(c.costUsd)}</span>
                  <BasisTag basis={c.basis} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {usage.byModel.map((m) => (
              <span key={`${m.channel}-${m.model}`} title={`${m.channel} · ${formatTokens(m.inputTokens)} in / ${formatTokens(m.outputTokens)} out`}>
                {m.model}
                {m.priceAssumed ? '*' : ''}: {formatUsd(m.costUsd)}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
            List-price value of the tokens, not your provider invoice
            {assumed ? '; * = assumed per-token rate for that model' : ''}. SMS agent usage is modelled from replies sent
            (emails and other AI features aren&apos;t included).
          </p>
        </>
      ) : (
        <EmptyChart message="No AI usage this period." />
      )}
    </Card>
  )
}
