'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Clock3, Mail, MessageSquare, Phone, RefreshCw } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import api from '@/lib/api'

function getStepsCount(steps) {
  if (!Array.isArray(steps)) return 0
  return steps.reduce((acc, group) => acc + (Array.isArray(group) ? group.length : 0), 0)
}

function flattenSteps(steps) {
  if (!Array.isArray(steps)) return []
  const out = []
  for (let gi = 0; gi < steps.length; gi++) {
    const group = steps[gi]
    if (!Array.isArray(group)) continue
    for (let si = 0; si < group.length; si++) out.push({ ...group[si], __groupIndex: gi, __index: si })
  }
  return out
}

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function StepIcon({ type }) {
  const Icon = type === 'call' ? Phone : type === 'email' ? Mail : MessageSquare
  return <Icon className="h-4 w-4 text-muted-foreground" />
}

function DownArrow() {
  return (
    <div className="flex items-center justify-center py-2 text-muted-foreground">
      <svg width="16" height="34" viewBox="0 0 16 34" fill="none" aria-hidden="true">
        <path d="M8 0V28" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
        <path
          d="M2 26L8 32L14 26"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export default function CampaignDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = useMemo(() => String(params?.id || ''), [params])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [campaign, setCampaign] = useState(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    const res = await api.get(`/api/campaign/${id}`)
    if (res?.success) {
      setCampaign(res?.data || null)
    } else {
      setError(res?.error || 'Failed to load campaign.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const title = campaign?.name || 'Campaign'
  const stepsCount = getStepsCount(campaign?.steps)
  const createdAt = formatDateTime(campaign?.createdAt)
  const steps = useMemo(() => {
    const flat = flattenSteps(campaign?.steps)
    // stable-ish ordering: by numeric order then group/index
    return flat.sort((a, b) => {
      const ao = Number(a?.order)
      const bo = Number(b?.order)
      if (Number.isFinite(ao) && Number.isFinite(bo) && ao !== bo) return ao - bo
      return (a?.__groupIndex ?? 0) - (b?.__groupIndex ?? 0) || (a?.__index ?? 0) - (b?.__index ?? 0)
    })
  }, [campaign?.steps])

  return (
    <MainLayout title="Campaign" subtitle="View campaign details">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-[13px] font-semibold text-foreground hover:bg-muted/40"
            >
              Back
            </button>
            <Link
              href="/marketing/campaigns"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-[13px] font-semibold text-foreground hover:bg-muted/40"
            >
              All Campaigns
            </Link>
          </div>

          <button
            type="button"
            onClick={load}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-[13px] font-semibold text-foreground hover:bg-muted/40"
          >
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-[13px] text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {loading ? (
            <div className="text-[13px] text-muted-foreground">Loading…</div>
          ) : !campaign ? (
            <div className="text-[13px] text-muted-foreground">No campaign data.</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[22px] font-bold text-foreground truncate">{title}</div>
                  <div className="mt-1 text-[13px] text-muted-foreground">{campaign?.description || '—'}</div>
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    Event: <span className="font-mono">{campaign?.event || '—'}</span>
                  </div>
                </div>
                {createdAt && (
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Created
                    </div>
                    <div className="mt-1 text-[12px] font-mono text-foreground">{createdAt}</div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-stretch">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="text-[11px] font-semibold text-muted-foreground">TRIGGER</div>
                  <div className="mt-2 text-[13px] font-semibold text-foreground">{campaign?.event || '—'}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Starts the campaign</div>
                </div>

                {steps.length > 0 ? <DownArrow /> : null}

                {steps.map((step, i) => {
                  const order = step?.order ?? i + 1
                  const schedule = formatDateTime(step?.scheduleDateAndTime)
                  return (
                    <div key={`${order}-${step?.__groupIndex ?? 0}-${step?.__index ?? 0}`} className="flex flex-col">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-semibold text-muted-foreground">STEP {order}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <StepIcon type={step?.type} />
                              <div className="text-[13px] font-semibold text-foreground">
                                {String(step?.type || '').toUpperCase() || '—'}
                              </div>
                            </div>
                          </div>
                          {schedule && (
                            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              {schedule}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                          <div className="rounded-lg border border-border bg-card px-3 py-2">
                            <div className="text-[10px] text-muted-foreground">Lead Stage</div>
                            <div className="mt-0.5 text-[12px] font-medium text-foreground">
                              {step?.leadStage || '—'}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-card px-3 py-2">
                            <div className="text-[10px] text-muted-foreground">Description</div>
                            <div className="mt-0.5 text-[12px] font-medium text-foreground">
                              {step?.description?.trim() ? step.description : '—'}
                            </div>
                          </div>
                        </div>

                        {step?.script?.trim() ? (
                          <div className="mt-3 rounded-lg border border-border bg-card px-3 py-2">
                            <div className="text-[10px] text-muted-foreground">Script</div>
                            <div className="mt-0.5 text-[12px] font-medium text-foreground whitespace-pre-wrap">
                              {step.script}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {i < steps.length - 1 && <DownArrow />}
                    </div>
                  )
                })}

                {stepsCount === 0 && (
                  <div className="mt-2 rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-[13px] text-muted-foreground">
                    No steps
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

