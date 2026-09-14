'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ConversationView from '@/app/inbox/components/ConversationView'
import ActiveCallPanel from '@/components/human-queue/ActiveCallPanel'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { getContactDisplayName } from '@/lib/utils'
import {
  applyEmailTemplate,
  buildLeadRecipient,
  buildSendOneEmailPayload,
  htmlToPlainText,
  mapEmailHistoryRecord,
  normalizeEmailAddress,
  validateEmailSendInput,
} from '@/lib/emailSend'
import {
  last10Digits,
  mapAiCallToMessage,
  mapHumanCallToMessage,
  mapSmsHistoryMessages,
  mergeSmsPages,
  mergeThreadByTimestamp,
} from '@/lib/inboxThread'

function locationIdsFrom(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map((id) => String(id?._id ?? id)).filter(Boolean)
  }
  const id = String(raw?._id ?? raw)
  return id && id !== 'undefined' && id !== 'null' ? [id] : []
}

function isMongoId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''))
}

function emailsMatchingAddress(records, contactEmail, contactName) {
  const normalized = normalizeEmailAddress(contactEmail)
  if (!normalized) return []
  return records
    .filter((r) => {
      const to = normalizeEmailAddress(r.to || r.email || r.leadID?.email)
      const from = normalizeEmailAddress(r.from)
      return to === normalized || from === normalized
    })
    .map((r) => mapEmailHistoryRecord(r, contactName))
}

function contactFromCustomer(customer, leadId = null) {
  return {
    id: leadId || customer.leadSourceID || customer._id,
    name: getContactDisplayName(customer),
    type: 'Customer',
    stage: '',
    nextVisit: '',
    phoneNumber: customer.phoneNumber || '',
    email: customer.email || '',
    locationID: customer.locationID || [],
  }
}

function conversationIdFor(customer) {
  return `customer-${customer._id}`
}

export default function CustomerInboxThread({ customer }) {
  const toast = useToast()
  const [leadId, setLeadId] = useState(
    customer.leadSourceID ? String(customer.leadSourceID) : null,
  )
  const [contact, setContact] = useState(() =>
    contactFromCustomer(customer, customer.leadSourceID ? String(customer.leadSourceID) : null),
  )
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [smsPage, setSmsPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [callPlacing, setCallPlacing] = useState(false)
  const [callLogsLoading, setCallLogsLoading] = useState(false)
  const [activeOutboundCall, setActiveOutboundCall] = useState(null)
  const [activeOutboundConnection, setActiveOutboundConnection] = useState(null)
  const [outboundCallStatus, setOutboundCallStatus] = useState('connecting')

  const conversationId = useMemo(
    () => conversationIdFor(customer),
    [customer._id],
  )
  const conversation = useMemo(
    () => ({
      id: conversationId,
      contact,
      lastMessage: '',
      timestamp: new Date().toISOString(),
      unread: 0,
      channel: 'SMS',
    }),
    [conversationId, contact],
  )

  const requestGenRef = useRef(0)
  const emailHistoryLoadedRef = useRef(false)
  const callHistoryLoadedRef = useRef(false)
  const callHistoryInFlightRef = useRef(false)
  const endingOutboundRef = useRef(false)
  const endOutboundCallRef = useRef(null)
  const activeOutboundConnectionRef = useRef(null)
  const smsPageInFlightRef = useRef(new Set())
  const callLogRefreshTimersRef = useRef([])

  const mergeChannel = useCallback((updater) => {
    setMessages((prev) => {
      const smsOnly = prev.filter((m) => m.channel === 'SMS')
      const emailOnly = prev.filter((m) => m.channel === 'Email')
      const callOnly = prev.filter((m) => m.channel === 'Call')
      const next = updater({ smsOnly, emailOnly, callOnly, prev })
      return mergeThreadByTimestamp(next.smsOnly, next.emailOnly, next.callOnly)
    })
  }, [])

  const loadEmails = useCallback(
    async (resolvedLeadId, contactEmail, contactName, gen) => {
      if (emailHistoryLoadedRef.current) return
      emailHistoryLoadedRef.current = true
      try {
        const allRes = await api.get('/api/emailHistory?limit=200')
        const allRecords = Array.isArray(allRes.data) ? allRes.data : []
        let records = emailsMatchingAddress(allRecords, contactEmail, contactName)

        if (resolvedLeadId && isMongoId(resolvedLeadId)) {
          const byLeadRes = await api.get(
            `/api/emailHistory?leadID=${encodeURIComponent(resolvedLeadId)}&limit=200`,
          )
          const leadRecords = Array.isArray(byLeadRes.data) ? byLeadRes.data : []
          const seen = new Set(records.map((m) => m.id))
          for (const rec of leadRecords) {
            const mapped = mapEmailHistoryRecord(rec, contactName)
            if (!seen.has(mapped.id)) {
              seen.add(mapped.id)
              records.push(mapped)
            }
          }
        }

        if (gen != null && gen !== requestGenRef.current) return
        mergeChannel(({ smsOnly, callOnly }) => ({
          smsOnly,
          emailOnly: records,
          callOnly,
        }))
      } catch (e) {
        if (gen == null || gen === requestGenRef.current) {
          emailHistoryLoadedRef.current = false
        }
        console.error('Failed to load email history:', e)
      }
    },
    [mergeChannel],
  )

  const loadSmsPage = useCallback(
    async (resolvedLeadId, contactName, page = 1, gen) => {
      if (!resolvedLeadId || !isMongoId(resolvedLeadId)) {
        setHasMore(false)
        return
      }
      const pageKey = `${resolvedLeadId}:${page}`
      if (smsPageInFlightRef.current.has(pageKey)) return
      smsPageInFlightRef.current.add(pageKey)
      setLoadingMore(true)
      try {
        const res = await api.get(
          `/api/smsHistory/conversations/${resolvedLeadId}?page=${page}`,
        )
        if (!res.success) {
          console.error('Failed to load SMS history:', res.error)
          return
        }
        if (gen != null && gen !== requestGenRef.current) return
        const mapped = mapSmsHistoryMessages(
          Array.isArray(res.data?.messages) ? res.data.messages : [],
          contactName,
        )
        mergeChannel(({ smsOnly, emailOnly, callOnly }) => {
          const optimisticSms =
            page === 1
              ? smsOnly.filter(
                  (m) =>
                    !mapped.some((s) => s.id === m.id) &&
                    !isMongoId(m.id),
                )
              : []
          const smsSlice =
            page === 1
              ? mergeSmsPages(mapped, optimisticSms)
              : mergeSmsPages(mapped, smsOnly)
          return { smsOnly: smsSlice, emailOnly, callOnly }
        })
        setSmsPage(page)
        setHasMore(Boolean(res.data?.hasMore))
      } catch (e) {
        console.error('Failed to load SMS history:', e)
      } finally {
        smsPageInFlightRef.current.delete(pageKey)
        if (gen == null || gen === requestGenRef.current) {
          setLoadingMore(false)
        }
      }
    },
    [mergeChannel],
  )

  useEffect(() => {
    const gen = ++requestGenRef.current
    const initialLeadId = customer.leadSourceID ? String(customer.leadSourceID) : null
    setLeadId(initialLeadId)
    setContact(contactFromCustomer(customer, initialLeadId))
    setMessages([])
    setHasMore(false)
    setSmsPage(1)
    emailHistoryLoadedRef.current = false
    callHistoryLoadedRef.current = false

    const phone = last10Digits(customer.phoneNumber)
    const email = normalizeEmailAddress(customer.email)
    const name = getContactDisplayName(customer)

    async function load() {
      const convRes = await api.get('/api/smsHistory/conversations')
      if (gen !== requestGenRef.current) return

      const convs = convRes.success ? convRes.data || [] : []
      const match = convs.find(
        (c) =>
          (phone && last10Digits(c.phoneNumber) === phone) ||
          (email && normalizeEmailAddress(c.email) === email),
      )
      const resolvedLeadId = match?.leadID
        ? String(match.leadID)
        : initialLeadId

      if (gen !== requestGenRef.current) return
      if (resolvedLeadId) setLeadId(resolvedLeadId)

      setContact((prev) => ({
        ...prev,
        ...contactFromCustomer(customer, resolvedLeadId),
        phoneNumber: match?.phoneNumber || customer.phoneNumber || prev.phoneNumber,
        email: match?.email || customer.email || prev.email,
        locationID: match?.locationID || customer.locationID || prev.locationID,
        name: match?.name || prev.name,
      }))

      await Promise.all([
        loadEmails(resolvedLeadId, match?.email || customer.email, name, gen),
        resolvedLeadId ? loadSmsPage(resolvedLeadId, name, 1, gen) : Promise.resolve(),
      ])
    }

    load()
  }, [
    customer._id,
    customer.email,
    customer.phoneNumber,
    customer.name,
    customer.leadSourceID,
    loadEmails,
    loadSmsPage,
  ])

  const loadCalls = useCallback(
    async ({ force = false } = {}) => {
      const phoneNumber = String(contact.phoneNumber || customer.phoneNumber || '').trim()
      if (!phoneNumber) {
        mergeChannel(({ smsOnly, emailOnly }) => ({
          smsOnly,
          emailOnly,
          callOnly: [],
        }))
        callHistoryLoadedRef.current = true
        setCallLogsLoading(false)
        return
      }
      if (!force && (callHistoryLoadedRef.current || callHistoryInFlightRef.current)) return

      callHistoryInFlightRef.current = true
      setCallLogsLoading(true)
      try {
        const humanParams = new URLSearchParams({ limit: '100' })
        if (leadId && isMongoId(leadId)) humanParams.set('leadID', String(leadId))
        else humanParams.set('phoneNumber', phoneNumber)

        const [humanRes, aiRes] = await Promise.all([
          api.get(`/api/human-call/history?${humanParams.toString()}`),
          leadId && isMongoId(leadId)
            ? api.get(`/api/ai-calling?leadID=${encodeURIComponent(leadId)}&limit=100`)
            : Promise.resolve({ success: false, data: [] }),
        ])

        const humanCalls = Array.isArray(humanRes.data) ? humanRes.data : []
        const aiCalls = Array.isArray(aiRes.data) ? aiRes.data : []
        const callMsgs = [
          ...humanCalls.map(mapHumanCallToMessage),
          ...aiCalls.map(mapAiCallToMessage),
        ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

        mergeChannel(({ smsOnly, emailOnly, callOnly }) => {
          const priorByRecordId = new Map(
            callOnly
              .filter((m) => m.callRecordId)
              .map((m) => [m.callRecordId, m]),
          )
          const mergedCalls = callMsgs.map((msg) => {
            const prior = msg.callRecordId ? priorByRecordId.get(msg.callRecordId) : null
            if (!prior) return msg
            return {
              ...msg,
              hasRecording: msg.hasRecording || prior.hasRecording,
              recordingUrl: msg.recordingUrl || prior.recordingUrl,
            }
          })
          return { smsOnly, emailOnly, callOnly: mergedCalls }
        })
        callHistoryLoadedRef.current = true
      } catch (e) {
        callHistoryLoadedRef.current = false
        console.error('Failed to load call history:', e)
      } finally {
        callHistoryInFlightRef.current = false
        setCallLogsLoading(false)
      }
    },
    [contact.phoneNumber, customer.phoneNumber, leadId, mergeChannel],
  )

  const scheduleCallLogRefresh = useCallback(() => {
    callLogRefreshTimersRef.current.forEach((t) => clearTimeout(t))
    const run = () => {
      callHistoryLoadedRef.current = false
      loadCalls({ force: true })
    }
    run()
    callLogRefreshTimersRef.current = [
      setTimeout(run, 2500),
      setTimeout(run, 6000),
      setTimeout(run, 12000),
    ]
  }, [loadCalls])

  useEffect(
    () => () => {
      callLogRefreshTimersRef.current.forEach((t) => clearTimeout(t))
    },
    [],
  )

  useEffect(() => {
    activeOutboundConnectionRef.current = activeOutboundConnection
  }, [activeOutboundConnection])

  const clearOutboundCallUi = useCallback(() => {
    setActiveOutboundCall(null)
    setActiveOutboundConnection(null)
    setOutboundCallStatus('connecting')
  }, [])

  const handleEndOutboundCall = useCallback(
    async (opts = {}) => {
      const remoteHangup = Boolean(opts && opts.remoteHangup === true)
      if (endingOutboundRef.current) return
      endingOutboundRef.current = true
      const callId = activeOutboundCall?.id || activeOutboundCall?._id
      try {
        const { disconnectConnection } = await import('@/lib/twilioVoiceClient')
        disconnectConnection(activeOutboundConnectionRef.current || activeOutboundConnection)
        if (callId) {
          await api.post(`/api/human-call/${callId}/end`)
        }
      } catch (e) {
        console.error(e)
      } finally {
        clearOutboundCallUi()
        scheduleCallLogRefresh()
        toast.success({
          title: 'Call ended',
          message: remoteHangup
            ? 'The other party disconnected. Updating call log…'
            : 'You ended the call. Updating call log…',
        })
        setTimeout(() => {
          endingOutboundRef.current = false
        }, 500)
      }
    },
    [activeOutboundCall, activeOutboundConnection, clearOutboundCallUi, scheduleCallLogRefresh, toast],
  )

  useEffect(() => {
    endOutboundCallRef.current = handleEndOutboundCall
  }, [handleEndOutboundCall])

  useEffect(() => {
    const callId = activeOutboundCall?.id || activeOutboundCall?._id
    if (!callId) return undefined

    let cancelled = false
    const terminal = new Set(['completed', 'busy', 'no-answer', 'canceled', 'failed'])

    const poll = async () => {
      try {
        if (endingOutboundRef.current) return
        const res = await api.get(`/api/human-call/${callId}`)
        if (cancelled || endingOutboundRef.current || !res.success || !res.data) return
        const status = String(res.data.status || '').toLowerCase()
        if (!terminal.has(status)) return
        endOutboundCallRef.current?.({ remoteHangup: true })
      } catch (e) {
        console.error(e)
      }
    }

    const interval = setInterval(poll, 3000)
    poll()
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [activeOutboundCall?.id, activeOutboundCall?._id])

  const revertOptimisticMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }, [])

  const handleSendMessage = async ({
    content,
    subject,
    channel,
    scheduleNow = true,
    scheduleDate = null,
    contentHtml = null,
  }) => {
    if (!(String(contentHtml || content || '').trim())) return false

    const effectiveChannel = channel || 'SMS'
    const leadRecipient = buildLeadRecipient(contact, {
      ...contact,
      _id: leadId && isMongoId(leadId) ? leadId : undefined,
    })

    if (effectiveChannel === 'Email') {
      const validationError = validateEmailSendInput({
        lead: leadRecipient,
        subject,
        content,
        html: contentHtml,
        scheduleNow,
        scheduleDate,
      })
      if (validationError) {
        toast.error({ title: 'Cannot send email', message: validationError })
        return false
      }
    } else if (scheduleNow === false) {
      if (!scheduleDate) {
        toast.error({
          title: 'Cannot send SMS',
          message: 'scheduleDate is required when scheduling for later',
        })
        return false
      }
      const when = new Date(scheduleDate)
      if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        toast.error({
          title: 'Cannot send SMS',
          message: 'scheduleDate must be a valid future datetime',
        })
        return false
      }
    }

    const messageId = `${Date.now()}`
    const personalizedContent =
      effectiveChannel === 'SMS'
        ? applyEmailTemplate(String(content || '').trim(), leadRecipient)
        : String(content || '').trim()
    const personalizedHtml =
      contentHtml && effectiveChannel === 'Email'
        ? applyEmailTemplate(String(contentHtml).trim(), leadRecipient)
        : null
    const htmlForSend =
      contentHtml && effectiveChannel === 'Email' ? String(contentHtml).trim() : null
    const displayContent = personalizedContent || htmlToPlainText(personalizedHtml || '')

    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        sender: 'You',
        direction: 'outbound',
        content: displayContent,
        contentHtml: personalizedHtml || undefined,
        subject: effectiveChannel === 'Email' ? (subject || '').trim() : undefined,
        timestamp: new Date().toISOString(),
        channel: effectiveChannel,
      },
    ])

    if (effectiveChannel === 'Email') setEmailSending(true)
    else setSmsSending(true)

    try {
      if (effectiveChannel === 'SMS') {
        const phoneNumber = contact.phoneNumber || customer.phoneNumber
        if (!phoneNumber) {
          revertOptimisticMessage(messageId)
          toast.error({
            title: 'Missing phone',
            message: 'This student has no phone number on file.',
          })
          return false
        }

        const result = await api.post('/api/sms/send-one', {
          lead: {
            ...(leadId && isMongoId(leadId) ? { _id: leadId } : {}),
            phoneNumber,
            name: getContactDisplayName(contact),
            locationID: locationIdsFrom(contact.locationID || customer.locationID),
            email: contact.email || customer.email || '',
          },
          message: personalizedContent,
          scheduleNow,
          scheduleDate,
        })
        if (!result.success) {
          revertOptimisticMessage(messageId)
          toast.error({
            title: 'SMS not sent',
            message: result.error || 'Could not send SMS. Check the studio phone is connected.',
          })
          return false
        }
        toast.success({
          title: scheduleNow ? 'SMS sent' : 'SMS scheduled',
          message:
            result.message ||
            (scheduleNow ? 'SMS sent successfully' : 'SMS scheduled successfully'),
        })
        return true
      }

      const payload = buildSendOneEmailPayload({
        lead: leadRecipient,
        subject,
        content: personalizedContent,
        html: htmlForSend,
        scheduleNow,
        scheduleDate,
        useTemplate: Boolean(htmlForSend),
      })
      const preferredLocationID = payload.preferredLocationID || null
      const result = await api.post(
        '/api/email/send-one',
        payload,
        preferredLocationID ? { headers: { 'x-location-id': preferredLocationID } } : {},
      )
      if (!result.success) {
        revertOptimisticMessage(messageId)
        toast.error({
          title: 'Email not sent',
          message: result.error || 'Could not send email.',
        })
        return false
      }
      toast.success({
        title: scheduleNow ? 'Email sent' : 'Email scheduled',
        message:
          result.message ||
          (scheduleNow ? 'Email sent successfully' : 'Email scheduled successfully'),
      })
      return true
    } catch (e) {
      console.error('Failed to send message:', e)
      revertOptimisticMessage(messageId)
      toast.error({
        title: effectiveChannel === 'Email' ? 'Email not sent' : 'SMS not sent',
        message: 'Something went wrong. Please try again.',
      })
      return false
    } finally {
      if (effectiveChannel === 'Email') setEmailSending(false)
      else setSmsSending(false)
    }
  }

  const handlePlaceCall = useCallback(async () => {
    if (activeOutboundCall) {
      toast.error({
        title: 'Call in progress',
        message: 'End the current call before placing another.',
      })
      return
    }

    const phoneNumber = contact.phoneNumber || customer.phoneNumber
    if (!phoneNumber) {
      toast.error({
        title: 'Missing phone',
        message: 'This student has no phone number on file.',
      })
      return
    }

    setCallPlacing(true)
    endingOutboundRef.current = false
    let callHistoryId = null
    try {
      const leadPayload = {
        ...(leadId && isMongoId(leadId) ? { _id: leadId } : {}),
        phoneNumber,
        name: getContactDisplayName(contact),
        locationID: locationIdsFrom(contact.locationID || customer.locationID),
      }
      const result = await api.post('/api/human-call/call-now', { lead: leadPayload })
      if (!result.success) {
        toast.error({
          title: 'Call failed',
          message: result.error || 'Could not place the call.',
        })
        return
      }

      const conferenceName = result.data?.conferenceName
      callHistoryId = result.data?.callHistoryId || result.data?.call?._id
      const fromNumber = result.data?.from || ''

      setActiveOutboundCall({
        id: callHistoryId,
        _id: callHistoryId,
        name: getContactDisplayName(contact),
        leadName: getContactDisplayName(contact),
        phone: phoneNumber,
        phoneNumber,
        fromNumber,
        conferenceName,
        initiatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      })
      setOutboundCallStatus('connecting')

      if (conferenceName) {
        try {
          const { joinConferenceCall, subscribeToConnectionEvents } = await import(
            '@/lib/twilioVoiceClient'
          )
          const connection = await joinConferenceCall({
            fetchToken: () => api.get('/api/human-call/voice-token'),
            conferenceName,
            callHistoryId,
          })
          setActiveOutboundConnection(connection)
          setOutboundCallStatus('connected')
          subscribeToConnectionEvents(connection, {
            accept: () => setOutboundCallStatus('connected'),
            disconnect: () => {
              setOutboundCallStatus('ended')
              setActiveOutboundConnection(null)
              if (!endingOutboundRef.current) {
                endOutboundCallRef.current?.({ remoteHangup: true })
              }
            },
            cancel: () => {
              setOutboundCallStatus('ended')
              setActiveOutboundConnection(null)
              if (!endingOutboundRef.current) {
                endOutboundCallRef.current?.({ remoteHangup: true })
              }
            },
            error: () => {
              setOutboundCallStatus('ended')
              toast.error({
                title: 'Call audio error',
                message: 'Browser call connection failed. Check microphone permissions.',
              })
            },
          })
        } catch (voiceErr) {
          console.error(voiceErr)
          if (callHistoryId) {
            await api.post(`/api/human-call/${callHistoryId}/end`).catch(() => {})
          }
          clearOutboundCallUi()
          toast.error({
            title: 'Browser audio failed',
            message:
              voiceErr?.message ||
              'Could not connect your browser mic. Allow microphone access and try again.',
          })
          scheduleCallLogRefresh()
          return
        }
      }

      const callRecord = result.data?.call
      const callMsg = callRecord
        ? mapHumanCallToMessage({ ...callRecord, fromNumber: callRecord.fromNumber || fromNumber })
        : {
            id: `human-call-${result.data?.sid || Date.now()}`,
            callRecordId: callHistoryId ? String(callHistoryId) : null,
            sender: 'You',
            direction: 'outbound',
            content: `Outbound call${fromNumber ? ` from ${fromNumber}` : ''} · initiated`,
            timestamp: new Date().toISOString(),
            channel: 'Call',
            callKind: 'human',
            status: 'initiated',
            phoneNumber,
            fromNumber,
            hasRecording: false,
          }

      mergeChannel(({ smsOnly, emailOnly, callOnly }) => ({
        smsOnly,
        emailOnly,
        callOnly: [...callOnly.filter((m) => m.id !== callMsg.id), callMsg],
      }))

      toast.success({
        title: 'Calling…',
        message: fromNumber
          ? `Dialing ${phoneNumber} from studio ${fromNumber}. Use the call panel to mute or hang up.`
          : `Dialing ${phoneNumber} from your studio number.`,
      })
    } catch (e) {
      console.error(e)
      if (callHistoryId) {
        await api.post(`/api/human-call/${callHistoryId}/end`).catch(() => {})
      }
      clearOutboundCallUi()
      toast.error({ title: 'Call failed', message: 'Something went wrong placing the call.' })
    } finally {
      setCallPlacing(false)
    }
  }, [
    activeOutboundCall,
    clearOutboundCallUi,
    contact,
    customer.locationID,
    customer.phoneNumber,
    leadId,
    mergeChannel,
    scheduleCallLogRefresh,
    toast,
  ])

  const handleLoadMore = useCallback(() => {
    if (!leadId || !hasMore || loadingMore) return
    loadSmsPage(leadId, getContactDisplayName(contact), smsPage + 1)
  }, [leadId, hasMore, loadingMore, loadSmsPage, contact, smsPage])

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {activeOutboundCall && (
        <ActiveCallPanel
          mode="outbound"
          call={activeOutboundCall}
          connection={activeOutboundConnection}
          callStatus={outboundCallStatus}
          canManage={false}
          onEndCall={() => handleEndOutboundCall()}
          onClose={() => handleEndOutboundCall()}
        />
      )}
      <ConversationView
        conversation={conversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
        leadData={contact}
        emailSending={emailSending}
        smsSending={smsSending}
        callPlacing={callPlacing}
        callLogsLoading={callLogsLoading}
        onPlaceCall={handlePlaceCall}
        onEmailTabActive={() => loadEmails(leadId, contact.email || customer.email, getContactDisplayName(contact))}
        onCallTabActive={() => loadCalls()}
        embedded
      />
    </div>
  )
}
