'use client'

import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Target,
  TrendingUp,
  ListChecks,
  Sparkles,
  Lightbulb,
  BarChart3,
  Grid3X3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  parseSuccessEvaluation,
  getEvaluationSummary,
  getEvaluationTone,
  getScoreTone,
  getRubricLabel,
} from '@/lib/successEvaluation'

const TONE_STYLES = {
  success: {
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
    bar: 'bg-emerald-500',
    ring: 'text-emerald-600',
    soft: 'bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  warning: {
    badge: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
    bar: 'bg-amber-500',
    ring: 'text-amber-600',
    soft: 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50',
    icon: MinusCircle,
    iconClass: 'text-amber-600',
  },
  error: {
    badge: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800',
    bar: 'bg-red-500',
    ring: 'text-red-600',
    soft: 'bg-red-50/70 border-red-200/80 dark:bg-red-950/30 dark:border-red-900/50',
    icon: XCircle,
    iconClass: 'text-red-600',
  },
  neutral: {
    badge: 'text-muted-foreground bg-muted border-border',
    bar: 'bg-primary',
    ring: 'text-primary',
    soft: 'bg-muted/40 border-border',
    icon: Target,
    iconClass: 'text-muted-foreground',
  },
}

function ToneBadge({ tone, children, className }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral
  const Icon = styles.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border',
        styles.badge,
        className
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0', styles.iconClass)} />
      {children}
    </span>
  )
}

function ProgressBar({ value, max, tone, label = 'Score' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground tabular-nums">
          {value}/{max} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', styles.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ScoreHero({ score, max = 10, tone, subtitle }) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.neutral
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  return (
    <div className={cn('flex items-center gap-4 rounded-xl border px-4 py-4', styles.soft)}>
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
        <svg className="absolute inset-0 h-16 w-16 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className={styles.ring}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        <span className="text-lg font-bold tabular-nums text-foreground">{score}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Overall score</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">
          {score}
          <span className="text-base font-normal text-muted-foreground"> / {max}</span>
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function MetaGrid({ meta, className }) {
  if (!meta?.length) return null
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {meta.map(({ key, value }) => (
        <div key={`${key}-${value}`} className="rounded-lg border border-border bg-card px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{key}</p>
          <p className="text-sm font-semibold text-foreground">{value}</p>
        </div>
      ))}
    </div>
  )
}

function RecommendationBox({ text }) {
  if (!text) return null
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-primary mb-1 flex items-center gap-1">
        <Lightbulb className="h-3 w-3" />
        Recommendation
      </p>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  )
}

function CriterionScoreCard({ label, score, max, reason, index }) {
  const tone = score != null ? getScoreTone(score, max || 10) : 'neutral'
  const styles = TONE_STYLES[tone]
  const pct = max > 0 && score != null ? Math.round((score / max) * 100) : 0

  return (
    <li className={cn('rounded-lg border px-3 py-3', styles.soft)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
            Criterion {index}
          </p>
          <p className="text-sm font-medium text-foreground leading-snug">{label}</p>
        </div>
        {score != null && (
          <span className={cn('shrink-0 text-sm font-bold tabular-nums', styles.iconClass)}>
            {score}/{max}
          </span>
        )}
      </div>
      {score != null && (
        <div className="h-1.5 rounded-full bg-muted/80 overflow-hidden mb-2">
          <div className={cn('h-full rounded-full', styles.bar)} style={{ width: `${pct}%` }} />
        </div>
      )}
      {reason && <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>}
    </li>
  )
}

function ChecklistView({ parsed }) {
  const tone = getEvaluationTone(parsed)
  return (
    <div className="space-y-4">
      <ProgressBar value={parsed.passedCount} max={parsed.totalCount} tone={tone} label="Completion" />
      <ul className="space-y-2">
        {parsed.items.map((item) => (
          <li
            key={item.number}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm',
              item.passed
                ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
                : 'border-border bg-muted/30'
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                item.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
              )}
              aria-hidden
            >
              {item.passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                Step {item.number}
              </p>
              <p className="text-foreground leading-snug">{item.label}</p>
            </div>
            <span
              className={cn(
                'shrink-0 text-[10px] font-semibold uppercase tracking-wide',
                item.passed ? 'text-emerald-700' : 'text-muted-foreground'
              )}
            >
              {item.passed ? 'Yes' : 'No'}
            </span>
          </li>
        ))}
      </ul>
      <MetaGrid meta={parsed.meta} />
      {parsed.summary && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Analysis
          </p>
          <p className="text-sm text-foreground leading-relaxed">{parsed.summary}</p>
        </div>
      )}
    </div>
  )
}

function AutomaticRubricView({ parsed }) {
  const tone = getEvaluationTone(parsed)
  const recommendation = parsed.meta?.find((m) => /recommendation/i.test(m.key))?.value
  const otherMeta = parsed.meta?.filter((m) => !/recommendation/i.test(m.key)) || []
  const stage = parsed.meta?.find((m) => /stage/i.test(m.key))?.value

  return (
    <div className="space-y-4">
      <ScoreHero
        score={parsed.overallScore}
        max={parsed.overallMax}
        tone={tone}
        subtitle={stage ? `Stage: ${stage}` : `${parsed.criteria.length} criteria evaluated`}
      />
      <ProgressBar
        value={parsed.overallScore}
        max={parsed.overallMax}
        tone={tone}
        label="Overall performance"
      />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <BarChart3 className="h-3 w-3" />
          Criteria breakdown
        </p>
        <ul className="space-y-2">
          {parsed.criteria.map((criterion, i) => (
            <CriterionScoreCard
              key={`${criterion.label}-${i}`}
              index={i + 1}
              label={criterion.label}
              score={criterion.score}
              max={criterion.max}
              reason={criterion.reason}
            />
          ))}
        </ul>
      </div>
      <MetaGrid meta={otherMeta} />
      <RecommendationBox text={recommendation} />
    </div>
  )
}

function MatrixView({ parsed }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        <Grid3X3 className="h-3 w-3" />
        Performance matrix
      </p>
      <ul className="space-y-2">
        {parsed.criteria.map((criterion, i) => {
          const tone =
            criterion.tone ||
            (criterion.score != null ? getScoreTone(criterion.score, criterion.max || 10) : 'neutral')
          const styles = TONE_STYLES[tone]
          return (
            <li key={`${criterion.label}-${i}`} className={cn('rounded-lg border px-3 py-3', styles.soft)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{criterion.label}</p>
                  {criterion.reason && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{criterion.reason}</p>
                  )}
                </div>
                {criterion.level ? (
                  <ToneBadge tone={tone}>{criterion.level}</ToneBadge>
                ) : criterion.score != null ? (
                  <span className={cn('text-sm font-bold tabular-nums shrink-0', styles.iconClass)}>
                    {criterion.score}/{criterion.max}
                  </span>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      <MetaGrid meta={parsed.meta} />
      {parsed.summary && (
        <p className="text-sm text-muted-foreground leading-relaxed">{parsed.summary}</p>
      )}
    </div>
  )
}

function PassFailView({ parsed }) {
  const tone = parsed.passed ? 'success' : 'error'
  const styles = TONE_STYLES[tone]
  const Icon = styles.icon
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border px-4 py-4',
        parsed.passed
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full',
          parsed.passed ? 'bg-emerald-100' : 'bg-red-100'
        )}
      >
        <Icon className={cn('h-7 w-7', styles.iconClass)} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Outcome</p>
        <p className="text-xl font-semibold text-foreground">{parsed.label}</p>
      </div>
    </div>
  )
}

function NumericView({ parsed }) {
  const tone = getEvaluationTone(parsed)
  return (
    <div className="space-y-4">
      <ScoreHero score={parsed.value} max={parsed.max} tone={tone} />
      <ProgressBar value={parsed.value} max={parsed.max} tone={tone} label="Score" />
    </div>
  )
}

function PercentageView({ parsed }) {
  const tone = getEvaluationTone(parsed)
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1">
        <span className="text-4xl font-bold text-foreground tabular-nums">{parsed.value}</span>
        <span className="text-2xl font-semibold text-muted-foreground pb-0.5">%</span>
      </div>
      <ProgressBar value={parsed.value} max={parsed.max || 100} tone={tone} label="Completion" />
    </div>
  )
}

function ScaleStripView({ parsed }) {
  const tone = parsed.tone || 'neutral'
  const styles = TONE_STYLES[tone]
  const scale = parsed.scale || []
  const activeIndex = parsed.activeIndex

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Sparkles className={cn('h-5 w-5', styles.iconClass)} />
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rating</p>
          <p className="text-xl font-semibold text-foreground">{parsed.label}</p>
        </div>
      </div>
      {scale.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scale.map((step, i) => {
            const isActive = activeIndex === i || parsed.label === step
            return (
              <span
                key={step}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? cn(styles.badge, 'ring-1 ring-offset-1 ring-primary/20')
                    : 'border-border bg-muted/40 text-muted-foreground'
                )}
              >
                {step}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StructuredView({ parsed }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {parsed.pairs.map(({ key, value }) => {
        const bool = /^(true|false|yes|no|pass|fail)$/i.test(value)
        const passed = /^(true|yes|pass)$/i.test(value)
        const scoreMatch = value.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)/)
        return (
          <div key={key} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{key}</p>
            {bool ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-sm font-semibold',
                  passed ? 'text-emerald-700' : 'text-red-700'
                )}
              >
                {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {value}
              </span>
            ) : scoreMatch ? (
              <span className="text-sm font-bold tabular-nums text-foreground">{scoreMatch[0]}</span>
            ) : (
              <p className="text-sm font-semibold text-foreground">{value}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TextFallbackView({ parsed }) {
  const paragraphs = String(parsed.raw || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length <= 1) {
    return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{parsed.raw}</p>
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-sm text-foreground leading-relaxed">
          {p}
        </p>
      ))}
    </div>
  )
}

function FullEvaluation({ parsed, rubric }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Success evaluation</p>
        </div>
        {rubric && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {getRubricLabel(rubric)}
          </span>
        )}
      </div>
      <div className="p-4">
        {parsed.type === 'checklist' && <ChecklistView parsed={parsed} />}
        {parsed.type === 'automaticRubric' && <AutomaticRubricView parsed={parsed} />}
        {parsed.type === 'matrix' && <MatrixView parsed={parsed} />}
        {parsed.type === 'passFail' && <PassFailView parsed={parsed} />}
        {parsed.type === 'numeric' && <NumericView parsed={parsed} />}
        {parsed.type === 'percentage' && <PercentageView parsed={parsed} />}
        {(parsed.type === 'descriptive' || parsed.type === 'likert') && (
          <ScaleStripView parsed={parsed} />
        )}
        {parsed.type === 'structured' && <StructuredView parsed={parsed} />}
        {(parsed.type === 'text' || parsed.type === 'empty') && <TextFallbackView parsed={parsed} />}
      </div>
    </div>
  )
}

/** @param {{ evaluation?: string, rubric?: string, variant?: 'compact' | 'full', className?: string }} props */
export default function SuccessEvaluationDisplay({
  evaluation,
  rubric,
  variant = 'full',
  className,
}) {
  if (!evaluation) return null

  const parsed = parseSuccessEvaluation(evaluation, rubric)
  const tone = getEvaluationTone(parsed)
  const summary = getEvaluationSummary(parsed, evaluation)

  if (variant === 'compact') {
    if (!summary) return null
    return (
      <ToneBadge tone={tone} className={className}>
        {summary}
      </ToneBadge>
    )
  }

  return (
    <div className={className}>
      <FullEvaluation parsed={parsed} rubric={rubric} />
    </div>
  )
}

export { parseSuccessEvaluation, getEvaluationSummary, getEvaluationTone }
