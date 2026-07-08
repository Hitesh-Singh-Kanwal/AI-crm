'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRightLeft, CheckCircle2, Clock3, PhoneCall, UserCheck, Users } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import GlobalLoader from '@/components/shared/GlobalLoader'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { joinConferenceCall } from '@/lib/twilioVoiceClient'

const HUMAN_QUEUE_TABS = [
  { id: 'escalations', label: 'Escalations' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'transferred', label: 'Transferred' },
  { id: 'resolved', label: 'Resolved' },
]

function priorityClasses(priority) {
  if (priority === 'High') return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
  if (priority === 'Medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
}

function waitTimeClasses(minutes) {
  if (minutes >= 15) return 'text-red-600 dark:text-red-400'
  if (minutes >= 8) return 'text-amber-600 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function extractList(result) {
  return Array.isArray(result?.data) ? result.data : []
}

function HumanQueuePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const activeTab = searchParams?.get('tab') || 'escalations'

  const [escalations, setEscalations] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedEscalationId, setSelectedEscalationId] = useState(null)
  const [answeringId, setAnsweringId] = useState(null)
  const [resolvingId, setResolvingId] = useState(null)
  const [tabCounts, setTabCounts] = useState({
    escalations: 0,
    unassigned: 0,
    assigned: 0,
    transferred: 0,
    resolved: 0,
  })

  const [voiceSetupReady, setVoiceSetupReady] = useState(null)
  const [activeConnection, setActiveConnection] = useState(null)

  const fetchToken = useCallback(async () => {
    return api.get('/api/human-queue/voice-token')
  }, [])

  useEffect(() => {
    api.get('/api/human-queue/voice-setup').then((result) => {
      if (result.success) {
        setVoiceSetupReady(Boolean(result.data?.ready))
      }
    })
  }, [])

  const fetchQueueData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)

      const [queueResult, agentsResult, statsResult] = await Promise.all([
        api.get(`/api/human-queue?tab=${encodeURIComponent(activeTab)}`),
        api.get('/api/human-queue/agents'),
        api.get('/api/human-queue/stats'),
      ])

      if (queueResult.success) {
        const list = extractList(queueResult)
        setEscalations(list)
        setSelectedEscalationId((current) => {
          if (current && list.some((item) => item.id === current || item._id === current)) {
            return current
          }
          return list[0]?.id || list[0]?._id || null
        })
      }

      if (agentsResult.success) {
        setAgents(extractList(agentsResult))
      }

      if (statsResult.success && statsResult.data) {
        setTabCounts(statsResult.data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchQueueData()
    const interval = setInterval(() => fetchQueueData({ silent: true }), 5000)
    return () => clearInterval(interval)
  }, [fetchQueueData])

  const filteredEscalations = escalations

  const selectedEscalation = useMemo(() => {
    return (
      filteredEscalations.find(
        (item) => item.id === selectedEscalationId || item._id === selectedEscalationId,
      ) || filteredEscalations[0] || null
    )
  }, [filteredEscalations, selectedEscalationId])

  const agentById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents],
  )

  const transferCandidates = useMemo(() => {
    if (!selectedEscalation?.assignedUserId && !selectedEscalation?.assignedAgentId) return []
    const currentId = String(selectedEscalation.assignedUserId || selectedEscalation.assignedAgentId || '')
    return agents.filter((agent) => agent.id !== currentId && agent.availability === 'available')
  }, [agents, selectedEscalation])

  const handleAnswer = async (item) => {
    const itemId = item.id || item._id
    if (!itemId || !item.conferenceName) return

    setAnsweringId(itemId)
    try {
      const claimResult = await api.post(`/api/human-queue/${itemId}/claim`, {})
      if (!claimResult.success) {
        toast.error({ title: 'Unable to answer', message: claimResult.error || 'Could not claim this call.' })
        return
      }

      const claimedItem = claimResult.data || item
      const conferenceName = claimedItem.conferenceName || item.conferenceName

      const connection = await joinConferenceCall({
        fetchToken,
        conferenceName,
        queueItemId: itemId,
      })

      setActiveConnection(connection)
      toast.success({ title: 'Connected', message: 'You are now connected to the caller.' })
      await fetchQueueData({ silent: true })
    } catch (error) {
      console.error(error)
      await api.post(`/api/human-queue/${itemId}/release-claim`, {}).catch(() => {})
      toast.error({
        title: 'Call failed',
        message: error.message || 'Could not join the call. Check Twilio Voice SDK env configuration.',
      })
      await fetchQueueData({ silent: true })
    } finally {
      setAnsweringId(null)
    }
  }

  const handleTransfer = async (escalationId, toAgentId) => {
    if (!escalationId || !toAgentId) return

    const result = await api.post(`/api/human-queue/${escalationId}/transfer`, { targetUserId: toAgentId })
    if (!result.success) {
      toast.error({ title: 'Transfer failed', message: result.error || 'Could not transfer this call.' })
      return
    }

    toast.success({ title: 'Transferred', message: 'Call transferred to another agent.' })
    await fetchQueueData()
  }

  const handleResolve = async (escalationId) => {
    if (!escalationId) return
    setResolvingId(escalationId)

    try {
      activeConnection?.disconnect?.()
      setActiveConnection(null)

      const result = await api.post(`/api/human-queue/${escalationId}/resolve`, {})
      if (!result.success) {
        toast.error({ title: 'Resolve failed', message: result.error || 'Could not resolve this call.' })
        return
      }

      toast.success({ title: 'Resolved', message: 'Call marked as resolved.' })
      await fetchQueueData()
    } catch (error) {
      console.error(error)
      toast.error({ title: 'Error', message: 'Could not resolve this call.' })
    } finally {
      setResolvingId(null)
    }
  }

  const availableAgents = agents.filter((agent) => agent.availability === 'available').length

  return (
    <MainLayout title="Human Queue" subtitle="Live voice escalations from AI agents">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
          {voiceSetupReady === false && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Browser pickup is not configured yet. Add `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, and
              `TWILIO_TWIML_APP_SID` in backend env, then set the TwiML App Voice URL from AI Calling → Inbound IVR.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-full bg-muted p-1 w-fit">
            {HUMAN_QUEUE_TABS.map((tab) => {
              const isActive = activeTab === tab.id
              const tabCount = tabCounts[tab.id] || 0
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams?.toString() || '')
                    params.set('tab', tab.id)
                    router.push(`/inbox/human-queue?${params.toString()}`)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-4 h-9 text-sm transition-all',
                    isActive
                      ? 'bg-background text-[var(--studio-primary)] shadow-sm font-semibold'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs',
                      isActive
                        ? 'bg-[var(--studio-primary-light)] text-[var(--studio-primary)]'
                        : 'bg-background text-muted-foreground',
                    )}
                  >
                    {tabCount}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <GlobalLoader variant="inline" size="md" text="Loading human queue…" />
          </div>
        ) : (
          <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Escalation Queue</h2>
                  <p className="text-xs text-muted-foreground">
                    Voice callers transferred by AI assistants stay on the same Twilio number
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredEscalations.length}</span> requests
                  {refreshing ? ' · Updating…' : ''}
                </div>
              </div>

              <div className="space-y-2">
                {filteredEscalations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background py-10 text-center text-sm text-muted-foreground">
                    No queue items in this tab.
                  </div>
                ) : (
                  filteredEscalations.map((item) => {
                    const itemId = item.id || item._id
                    const assignedAgent = item.assignedUserId
                      ? agentById.get(String(item.assignedUserId))
                      : item.assignedAgentId
                        ? agentById.get(String(item.assignedAgentId))
                        : null
                    const isSelected =
                      selectedEscalation?.id === itemId || selectedEscalation?._id === itemId

                    return (
                      <button
                        key={itemId}
                        type="button"
                        onClick={() => setSelectedEscalationId(itemId)}
                        className={cn(
                          'w-full rounded-xl border p-3 text-left transition-colors',
                          isSelected
                            ? 'border-[var(--studio-primary)] bg-[var(--studio-primary-light)]/50'
                            : 'border-border bg-background hover:bg-muted/40',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-[color:var(--studio-primary)] text-white font-semibold">
                                {getInitials(item.leadName || item.callerName || 'Caller')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.leadName || item.callerName || 'Unknown caller'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{item.intent}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn('text-sm font-semibold', waitTimeClasses(item.waitMinutes || 0))}>
                              {item.waitMinutes || 0}m
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{item.status?.replace('_', ' ')}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                            {item.channel || 'Voice'}
                          </span>
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1', priorityClasses(item.priority))}>
                            {item.priority || 'Medium'}
                          </span>
                          {item.ivrLabel && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                              IVR: {item.ivrLabel}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                            {assignedAgent ? `Assigned: ${assignedAgent.name}` : 'Unassigned'}
                          </span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Human Agents</h3>
                  <span className="text-xs text-muted-foreground">
                    {availableAgents}/{agents.length} available
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {agents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background py-6 text-center text-xs text-muted-foreground">
                      No active team members found for this organisation.
                    </div>
                  ) : (
                    agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.activeChats}/{agent.maxConcurrent} active calls
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          agent.availability === 'available'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
                        )}
                      >
                        {agent.availability}
                      </span>
                    </div>
                  ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Selected Escalation</h3>
                    <p className="text-xs text-muted-foreground">Answer in browser, transfer, or resolve</p>
                  </div>
                  {selectedEscalation?.status === 'resolved' && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      Resolved
                    </span>
                  )}
                </div>

                {!selectedEscalation ? (
                  <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    Pick a queue item to manage it.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-border bg-background p-3">
                      <p className="text-sm font-medium text-foreground">
                        {selectedEscalation.leadName || selectedEscalation.callerName || 'Unknown caller'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedEscalation.phone || selectedEscalation.callerPhone}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Escalated by {selectedEscalation.escalatedBy || 'AI Voice Agent'} at{' '}
                        {formatDateTime(selectedEscalation.createdAt)}
                      </p>
                      <p className="text-sm text-foreground mt-2">
                        &quot;{selectedEscalation.lastMessage || selectedEscalation.escalationReason}&quot;
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Wait time:{' '}
                          <span className={cn('font-semibold', waitTimeClasses(selectedEscalation.waitMinutes || 0))}>
                            {selectedEscalation.waitMinutes || 0} minutes
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Current owner:{' '}
                          <span className="font-semibold text-foreground">
                            {selectedEscalation.assignedUserName
                              || (selectedEscalation.assignedUserId
                                ? agentById.get(String(selectedEscalation.assignedUserId))?.name
                                : null)
                              || 'Unassigned'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {selectedEscalation.status === 'waiting' && (
                      <Button
                        className="w-full"
                        onClick={() => handleAnswer(selectedEscalation)}
                        disabled={
                          answeringId === (selectedEscalation.id || selectedEscalation._id)
                          || voiceSetupReady === false
                        }
                      >
                        <PhoneCall className="h-4 w-4 mr-2" />
                        {answeringId ? 'Connecting…' : 'Answer in browser'}
                      </Button>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transfer to another available human
                      </label>
                      <select
                        defaultValue=""
                        disabled={
                          !['claimed', 'in_progress'].includes(selectedEscalation.status)
                          || selectedEscalation.status === 'resolved'
                        }
                        onChange={(event) => {
                          const targetAgent = event.target.value
                          if (targetAgent) {
                            handleTransfer(selectedEscalation.id || selectedEscalation._id, targetAgent)
                            event.target.value = ''
                          }
                        }}
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none disabled:opacity-60"
                      >
                        <option value="">Select agent</option>
                        {transferCandidates.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.activeChats}/{agent.maxConcurrent})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={
                        selectedEscalation.status === 'resolved'
                        || resolvingId === (selectedEscalation.id || selectedEscalation._id)
                      }
                      onClick={() => handleResolve(selectedEscalation.id || selectedEscalation._id)}
                      className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--studio-primary)] text-white text-sm font-medium hover:brightness-95 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {resolvingId ? 'Resolving…' : 'Mark as Resolved'}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Queue Rules
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <li>- AI assistants transfer callers here when a customer asks for a human.</li>
                  <li>- Any available rep can claim a waiting call and join in the browser.</li>
                  <li>- Calls stay on the same Twilio number throughout the handoff.</li>
                </ul>
              </div>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  )
}

export default function HumanQueuePage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="Human Queue" subtitle="Live voice escalations from AI agents">
          <div className="flex items-center justify-center py-20">
            <GlobalLoader variant="inline" size="md" text="Loading human queue…" />
          </div>
        </MainLayout>
      }
    >
      <HumanQueuePageContent />
    </Suspense>
  )
}
