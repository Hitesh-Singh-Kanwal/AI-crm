'use client'

import MainLayout from '@/components/layout/MainLayout'
import { cn } from '@/lib/utils'

const PRIMARY = 'var(--studio-primary)'

function Card({ className, children }) {
  return (
    <section
      className={cn(
        'bg-card border border-border text-card-foreground shadow-sm',
        className
      )}
      style={{ borderRadius: 16 }}
    >
      {children}
    </section>
  )
}

const queueTabs = [
  { key: 'all', label: 'All (2)', variant: 'neutral' },
  { key: 'dropped', label: 'Dropped (8)', variant: 'danger' },
  { key: 'escalated', label: 'Escalated (3)', variant: 'warning' },
  { key: 'converted', label: 'Converted (5)', variant: 'success' },
]

const queueItems = [
  {
    name: 'Sarah johnson',
    subtitle: 'Dropped at Objection',
    time: '2 hrs ago',
    statusDot: 'rose',
    stars: 4,
    active: true,
  },
  {
    name: 'James Smith',
    subtitle: 'Followed Up on Lead',
    time: '1 hr ago',
    statusDot: 'amber',
    stars: 4,
  },
  {
    name: 'Emma Brown',
    subtitle: 'Scheduled Meeting',
    time: '30 mins ago',
    statusDot: 'emerald',
    stars: 4,
  },
  {
    name: 'Michael Lee',
    subtitle: 'Completed Task',
    time: '15 mins ago',
    statusDot: 'blue',
    stars: 4,
  },
]

const transcript = [
  { role: 'AI', text: "Hi Sarah! Thanks for your interest in ballroom dancing!" },
  { role: 'Lead', text: "Hi! I've always wanted to learn but never had time." },
  { role: 'AI', text: "Totally understandable. What days of the week usually work best for you?" },
  { role: 'Lead', text: "Weeknights after 6pm are usually best." },
  { role: 'AI', text: "Perfect. We have beginner-friendly classes and a free intro. Would you like to schedule an intro lesson?" },
]

function Dot({ tone }) {
  const map = {
    rose: 'bg-rose-500',
    amber: 'bg-warning',
    emerald: 'bg-success',
    blue: 'bg-info',
    slate: 'bg-muted-foreground',
  }
  return <span className={cn('inline-block h-2 w-2 rounded-full', map[tone] || map.slate)} />
}

function Stars({ value = 0 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'text-[14px] leading-none',
            i < value ? 'text-warning' : 'text-border'
          )}
          aria-hidden
        >
          ★
        </span>
      ))}
      <span className="sr-only">{value} out of 5 stars</span>
    </div>
  )
}

function TabPill({ variant, children }) {
  const styles = {
    neutral: 'border-border text-muted-foreground bg-card hover:bg-muted/50',
    danger: 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15',
    warning: 'border-warning/20 text-warning bg-warning/10 hover:bg-warning/15',
    success: 'border-success/20 text-success bg-success/10 hover:bg-success/15',
  }
  return (
    <button
      type="button"
      className={cn(
        'h-7 px-3 rounded-full border text-xs font-medium transition-colors',
        styles[variant] || styles.neutral
      )}
    >
      {children}
    </button>
  )
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="text-[12px] text-muted-foreground">{label}</div>
      <div className="text-[12px] font-medium text-foreground">{value}</div>
    </div>
  )
}

function ProgressPill({ label, tone, active }) {
  const tones = {
    done: 'bg-success text-white border-success/20',
    pending: 'bg-card text-muted-foreground border-border',
    alert: 'bg-card text-rose-600 dark:text-rose-400 border-rose-500/40',
  }
  return (
    <div
      className={cn(
        'h-8 px-4 rounded-md border text-xs font-semibold flex items-center justify-center',
        tones[tone] || tones.pending,
        active && tone !== 'done' ? 'shadow-[0_0_0_3px_rgba(244,63,94,0.12)] dark:shadow-[0_0_0_3px_rgba(244,63,94,0.2)]' : null
      )}
    >
      {label}
    </div>
  )
}

function Bubble({ role, text }) {
  const isAI = role === 'AI'
  return (
    <div className="space-y-1">
      <div className={cn('text-[11px] font-semibold', isAI ? 'text-sky-600 dark:text-sky-400' : 'text-rose-500 dark:text-rose-400')}>
        {role}
      </div>
      <div
        className={cn(
          'rounded-xl px-4 py-3 text-[13px] leading-[1.35] border',
          isAI
            ? 'bg-sky-500/10 border-sky-500/20 text-foreground'
            : 'bg-rose-500/10 border-rose-500/20 text-foreground'
        )}
      >
        {text}
      </div>
    </div>
  )
}

export default function TrainingPage() {
  return (
    <MainLayout title="Training" subtitle="Review conversations and flag training opportunities.">
      <div className="h-full min-h-0 bg-background">
        <div className="h-full min-h-0 p-3 md:p-4">
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Conversations Queue */}
            <Card className="lg:col-span-3 overflow-hidden min-h-0 flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="text-[13px] font-semibold text-foreground">Conversations Queue</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {queueTabs.map((t) => (
                    <TabPill key={t.key} variant={t.variant}>
                      {t.label}
                    </TabPill>
                  ))}
                </div>
              </div>

              <div className="p-2 min-h-0 overflow-y-auto">
                <div className="space-y-1 pb-1">
                  {queueItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={cn(
                        'w-full text-left rounded-xl border transition-colors',
                        item.active
                          ? 'border-rose-500/40 bg-rose-500/10'
                          : 'border-transparent hover:border-border hover:bg-muted/40'
                      )}
                    >
                      <div className="px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-foreground truncate">
                              {item.name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                              <Dot tone={item.statusDot} />
                              <span className="truncate">{item.subtitle}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="text-[11px] text-muted-foreground">{item.time}</div>
                            <Stars value={item.stars} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Right: Lead Information + Transcript */}
            <Card className="lg:col-span-9 overflow-hidden min-h-0 flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">Lead Information</div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      <span className="font-medium text-foreground">Joseph</span> • Miami Beach
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 px-3 rounded-full border border-rose-500/40 bg-rose-500/10 text-[12px] font-semibold text-rose-600 dark:text-rose-400 flex items-center"
                    >
                      Outcome: Dropped Off
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1">
                  <div className="divide-y divide-border">
                    <StatRow label="Leads Name" value="Joseph" />
                    <StatRow label="Phone" value="(305) 555-0101" />
                    <StatRow label="Source" value="Meta Ad - Jan Campaign" />
                    <StatRow label="First Contact" value="Jan 27, 2026 2:34 PM" />
                  </div>
                  <div className="divide-y divide-border">
                    <StatRow label="Leads ID" value="#L-2847" />
                    <StatRow label="Email" value="sarah.j@gmail.com" />
                    <StatRow label="Studio" value="Miami Beach" />
                    <StatRow label="Last Activity" value="Jan 30, 2026 2:34 PM" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Milestone Reached</div>
                    <div className="mt-1 text-[12px] font-semibold text-rose-600 dark:text-rose-400">Objection Handling</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">Duration</div>
                    <div className="mt-1 text-[12px] font-semibold text-foreground">38 mins</div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <div className="text-[11px] text-muted-foreground">AI Confidence</div>
                    <div className="mt-1 text-[12px] font-semibold text-foreground">
                      67% <span className="text-[11px] font-semibold text-warning">(Low)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 min-h-0 overflow-y-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-semibold text-foreground">Milestone Progression</div>
                  <div className="text-[12px] text-muted-foreground">
                    Total Messages: <span className="font-semibold text-foreground">19</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ProgressPill label="Initial" tone="done" />
                  <ProgressPill label="Quality" tone="done" />
                  <ProgressPill label="Offer" tone="done" />
                  <ProgressPill label="Objection" tone="done" />
                  <ProgressPill label="Schedule" tone="alert" active />
                  <ProgressPill label="Booking" tone="pending" />
                  <ProgressPill label="Booked" tone="pending" />
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] font-semibold text-foreground">
                      Conversation Transcript{' '}
                      <span className="text-[12px] font-medium text-muted-foreground">
                        (Click any message to flag for training)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="h-8 px-3 rounded-full text-[12px] font-semibold border border-border bg-background hover:bg-muted/50 transition-colors text-[color:var(--studio-primary)]"
                    >
                      Flag selected
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    {transcript.map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary/40"
                      >
                        <Bubble role={m.role} text={m.text} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
