'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ContactList from '@/app/inbox/components/ContactList'
import ConversationView from '@/app/inbox/components/ConversationView'
import ContactDetails from '@/app/inbox/components/ContactDetails'
import NewConversationDialog from '@/app/inbox/components/NewConversationDialog'
import BatchSendDialog from '@/app/inbox/components/BatchSendDialog'
import ActiveCallPanel from '@/components/human-queue/ActiveCallPanel'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useInboxHeader } from '@/contexts/InboxHeaderContext'
import { cn, getContactDisplayName } from '@/lib/utils'
import api from '@/lib/api'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { useToast } from '@/components/ui/toast'
import {
  applyEmailTemplate,
  buildLeadRecipient,
  buildSendOneEmailPayload,
  dedupeThreadMessages,
  emailsForConversation,
  htmlToPlainText,
  indexEmailHistoryRecords,
  mapEmailHistoryRecord,
  normalizeEmailAddress,
  validateEmailSendInput,
} from '@/lib/emailSend'

function resolveContactType(leadOrConv = {}) {
  const explicit = String(leadOrConv.type || '').toLowerCase()
  if (
    explicit === 'teacher' ||
    explicit === 'teachers' ||
    explicit === 'customer' ||
    explicit === 'customers' ||
    explicit === 'lead' ||
    explicit === 'leads'
  ) {
    if (explicit.startsWith('teacher')) return 'Teacher'
    if (explicit.startsWith('customer')) return 'Customer'
    return 'Lead'
  }
  if (leadOrConv.convertedCustomerID || String(leadOrConv.stage || '').toLowerCase() === 'converted') {
    return 'Customer'
  }
  return 'Lead'
}

function buildInboxData(smsRecords, emailRecords) {
  const conversations = []
  const threadMessages = {}

  // Group all records by lead._id so one lead = one conversation thread
  const contactGroups = {}

  for (const rec of smsRecords) {
    const lead = rec.leadID
    const status = String(rec?.status || '').toLowerCase()
    const isInbound = status === 'received' || status === 'inbound'
    const resolvedPhone =
      lead?.phoneNumber ||
      (isInbound ? (rec?.from || rec?.phoneNumber) : (rec?.to || rec?.phoneNumber)) ||
      ''
    const key = lead?._id ? `lead-${lead._id}` : `sms-${String(rec.phoneNumber).replace(/\W/g, '_')}`
    if (!contactGroups[key]) {
      contactGroups[key] = {
        contact: {
          id: lead?._id || rec.phoneNumber,
          name: lead?.name || resolvedPhone || rec.phoneNumber,
          type: resolveContactType(lead || {}),
          stage: lead?.stage || '',
          nextVisit: '',
          phoneNumber: resolvedPhone,
          email: lead?.email || '',
          locationID: lead?.locationID || [],
        },
        messages: [],
      }
    } else if (resolvedPhone && !contactGroups[key].contact.phoneNumber) {
      contactGroups[key].contact.phoneNumber = resolvedPhone
    }
    contactGroups[key].messages.push({
      id: rec._id,
      sender: isInbound ? (lead?.name || resolvedPhone || 'Unknown') : 'You',
      direction: isInbound ? 'inbound' : 'outbound',
      content: rec.message,
      timestamp: rec.createdAt,
      channel: 'SMS',
    })
  }

  for (const rec of emailRecords) {
    const lead = rec.leadID
    const email = rec.to || rec.email || lead?.email || ''
    const key = lead?._id ? `lead-${lead._id}` : `email-${String(email).replace(/\W/g, '_')}`
    if (!contactGroups[key]) {
      contactGroups[key] = {
        contact: {
          id: lead?._id || email,
          name: lead?.name || email,
          type: resolveContactType(lead || {}),
          stage: lead?.stage || '',
          nextVisit: '',
          phoneNumber: lead?.phoneNumber || '',
          email,
          locationID: lead?.locationID || [],
        },
        messages: [],
      }
    } else {
      if (email && !contactGroups[key].contact.email) {
        contactGroups[key].contact.email = email
      }
    }
    contactGroups[key].messages.push(mapEmailHistoryRecord(rec))
  }

  for (const [convId, group] of Object.entries(contactGroups)) {
    const sortedMessages = dedupeThreadMessages(
      [...group.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    )
    const latest = sortedMessages[sortedMessages.length - 1]
    const lastPreview =
      latest.channel === 'Email'
        ? latest.subject || htmlToPlainText(latest.content) || latest.content
        : latest.content
    conversations.push({
      id: convId,
      contact: { ...group.contact, name: getContactDisplayName(group.contact) },
      lastMessage: lastPreview,
      timestamp: latest.timestamp,
      unread: 0,
      channel: latest.channel,
    })
    threadMessages[convId] = sortedMessages
  }

  conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return { conversations, threadMessages }
}

// Normalize contact type for filters (All, Customers, Leads, Teachers)
function normalizeContactType(type) {
  if (!type) return ''
  const t = String(type).toLowerCase()
  if (t === 'customer' || t === 'customers') return 'Customers'
  if (t === 'lead' || t === 'leads') return 'Leads'
  if (t === 'teacher' || t === 'teachers') return 'Teachers'
  return type
}

// Header tabs: All Customers | Leads | Teachers — each shows only that type.
// URL value "all" = Customers (tab label "All Customers").
const INBOX_FILTER_MAP = {
  all: 'Customers',
  customers: 'Customers',
  leads: 'Leads',
  teachers: 'Teachers',
}

function mergeThreadByTimestamp(smsMessages = [], emailMessages = [], callMessages = []) {
  return dedupeThreadMessages(
    [...smsMessages, ...emailMessages, ...callMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    ),
  )
}

function mergeSmsPages(incoming = [], existing = []) {
  return dedupeThreadMessages([...incoming, ...existing])
}

function mapHumanCallToMessage(call) {
  const status = call.status || 'initiated'
  const when = call.initiatedAt || call.createdAt
  const durationSec = call.duration ?? call.recordingDuration
  const durationLabel =
    durationSec != null && durationSec !== ''
      ? ` · ${Math.max(0, Number(durationSec))}s`
      : ''
  const fromLabel = call.fromNumber ? ` from ${call.fromNumber}` : ''
  return {
    id: `human-call-${call._id || call.twilioSid || when}`,
    callRecordId: call._id ? String(call._id) : null,
    sender: 'You',
    direction: 'outbound',
    content: `Outbound call${fromLabel} · ${status}${durationLabel}${
      call.errorMessage ? ` — ${call.errorMessage}` : ''
    }`,
    timestamp: when || new Date().toISOString(),
    channel: 'Call',
    callKind: 'human',
    status,
    phoneNumber: call.phoneNumber || '',
    fromNumber: call.fromNumber || '',
    hasRecording: Boolean(call.recordingUrl || call.recordingSid),
    recordingUrl: call.recordingUrl || '',
    duration: durationSec != null ? Number(durationSec) : null,
  }
}

function mapAiCallToMessage(call) {
  const status = call.status || 'unknown'
  const summary =
    call.analysis?.summary ||
    call.summary ||
    call.endedReason ||
    (call.assistantName ? `AI assistant: ${call.assistantName}` : 'AI call')
  return {
    id: `ai-call-${call._id || call.callId}`,
    sender: call.assistantName || 'AI',
    direction: 'outbound',
    content: summary,
    timestamp: call.startedAt || call.endedAt || call.createdAt || new Date().toISOString(),
    channel: 'Call',
    callKind: 'ai',
    status,
    phoneNumber: call.customer?.number || call.phoneNumber || '',
    assistantName: call.assistantName || '',
    recordingUrl: call.recordingUrl || call.stereoRecordingUrl || '',
    endedReason: call.endedReason || '',
  }
}

function InboxPageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isTalkToAssistant = pathname === '/inbox/talk-to-assistant'
  const { setInboxCounts } = useInboxHeader()
  const toast = useToast()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [showContactList, setShowContactList] = useState(true)
  const [isLgUp, setIsLgUp] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contactFilter, setContactFilter] = useState('Customers')
  const [conversations, setConversations] = useState([])
  const [threadMessages, setThreadMessages] = useState({})
  const [threadMeta, setThreadMeta] = useState({}) // { [convId]: { page, hasMore, loading } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [selectedLeadData, setSelectedLeadData] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [callPlacing, setCallPlacing] = useState(false)
  const [callLogsLoading, setCallLogsLoading] = useState(false)
  const [activeOutboundCall, setActiveOutboundCall] = useState(null)
  const [activeOutboundConnection, setActiveOutboundConnection] = useState(null)
  const [outboundCallStatus, setOutboundCallStatus] = useState('connecting')
  const selectedConversationRef = useRef(null)
  const endingOutboundRef = useRef(false)
  const callHistoryLoadedRef = useRef(new Set())
  const callHistoryInFlightRef = useRef(null)
  const callHistoryRequestIdRef = useRef({})
  const emailHistoryLoadedRef = useRef(new Set())
  const smsPageInFlightRef = useRef(new Set()) // `${convId}:${page}`
  const callLogRefreshTimersRef = useRef(new Map())
  const endOutboundCallRef = useRef(null)
  const activeOutboundConnectionRef = useRef(null)

  const upsertConversationAndAppendMessage = useCallback((payload) => {
    const { convId, contact, channel, content, subject, timestamp, extra = {} } = payload

    const effectiveChannel =
      channel === 'Email' ? 'Email' : channel === 'Call' ? 'Call' : 'SMS'
    const lastMessage = effectiveChannel === 'Email' ? (subject || content) : content

    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender: 'You',
      direction: 'outbound',
      content,
      subject: effectiveChannel === 'Email' ? subject : undefined,
      timestamp,
      channel: effectiveChannel,
      ...extra,
    }

    setThreadMessages((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), newMessage],
    }))

    setConversations((prev) => {
      const exists = prev.some((c) => c.id === convId)
      const nextRow = {
        id: convId,
        contact,
        lastMessage,
        timestamp,
        unread: 0,
        channel: effectiveChannel,
      }
      const updated = exists ? prev.map((c) => (c.id === convId ? { ...c, ...nextRow } : c)) : [nextRow, ...prev]
      return [...updated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    })
  }, [])

  const handleBatchSent = useCallback((result) => {
    const { channel, leads, subject, content, timestamp } = result || {}
    if (!Array.isArray(leads) || !content) return

    for (const lead of leads) {
      const convId = lead._id
        ? `lead-${lead._id}`
        : channel === 'SMS'
          ? `sms-${String(lead.phoneNumber).replace(/\W/g, '_')}`
          : `email-${String(lead.email).replace(/\W/g, '_')}`

      upsertConversationAndAppendMessage({
        convId,
        contact: {
          id: lead._id,
          name: getContactDisplayName(lead),
          type: resolveContactType(lead),
          stage: lead.stage || '',
          nextVisit: '',
          phoneNumber: lead.phoneNumber,
          email: lead.email,
          locationID: lead.locationID || [],
        },
        channel,
        subject,
        content,
        timestamp: timestamp || new Date().toISOString(),
      })
    }
  }, [upsertConversationAndAppendMessage])

  const fetchInboxData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [smsResult, emailResult] = await Promise.all([
        api.get('/api/smsHistory/conversations'),
        api.get('/api/emailHistory?limit=200'),
      ])

      const smsConvs = Array.isArray(smsResult.data) ? smsResult.data : []
      const emailRecords = Array.isArray(emailResult.data) ? emailResult.data : []

      const threads = {}

      // Build SMS conversations from new API shape
      const smsConversations = smsConvs.map((conv) => {
        const convId = `lead-${conv.leadID}`
        // messages not loaded yet for non-top leads — undefined signals "not fetched"
        return {
          id: convId,
          contact: {
            id: conv.leadID,
            name: getContactDisplayName({ name: conv.name, phoneNumber: conv.phoneNumber, email: conv.email }),
            type: resolveContactType(conv),
            stage: conv.stage || '',
            nextVisit: '',
            phoneNumber: conv.phoneNumber || '',
            email: conv.email || '',
            locationID: conv.locationID || [],
          },
          lastMessage: conv.lastMessage,
          timestamp: conv.lastMessageAt,
          unread: 0,
          channel: 'SMS',
        }
      })

      // Build email conversations from history
      const { conversations: emailConvs, threadMessages: emailThreads } = buildInboxData([], emailRecords)
      const emailIndex = indexEmailHistoryRecords(emailRecords)

      const smsLeadIds = new Set(smsConversations.map((c) => c.id))

      // Pre-load email history for SMS lead threads (by leadID + matching email address)
      for (const smsConv of smsConversations) {
        const emailMsgs = emailsForConversation(
          smsConv.id,
          smsConv.contact.email,
          emailIndex,
        )
        if (emailMsgs.length > 0) {
          threads[smsConv.id] = emailMsgs
          if (!smsConv.contact.email) {
            smsConv.contact.email = emailMsgs[emailMsgs.length - 1].recipientEmail || ''
          }
        }
      }

      // Email-only threads (no SMS conversation for that key)
      for (const [key, msgs] of Object.entries(emailThreads)) {
        if (!smsLeadIds.has(key)) threads[key] = msgs
      }

      // Deduplicate by id — SMS entry wins; hide email-only row if same address exists on SMS lead
      const smsEmails = new Set(
        smsConversations.map((c) => normalizeEmailAddress(c.contact.email)).filter(Boolean),
      )
      const uniqueEmailConvs = emailConvs.filter((c) => {
        if (smsLeadIds.has(c.id)) return false
        const addr = normalizeEmailAddress(c.contact.email)
        if (addr && smsEmails.has(addr) && c.id.startsWith('email-')) return false
        return true
      })
      const allConversations = [...smsConversations, ...uniqueEmailConvs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      setConversations(allConversations)
      setThreadMessages(threads)
    } catch (e) {
      console.error(e)
      setError('Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInboxData()
  }, [fetchInboxData])

  // Track desktop breakpoint so mobile master–detail doesn't fight desktop split panes
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      const matches = mq.matches
      setIsLgUp(matches)
      if (!matches) {
        setShowDetails(false)
      } else {
        setShowDetails(true)
        setShowContactList(true)
      }
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Sync URL ?filter= with contactFilter (header tabs use URL)
  const urlFilter = searchParams?.get('filter') || 'all'
  useEffect(() => {
    setContactFilter(INBOX_FILTER_MAP[urlFilter] ?? 'Customers')
  }, [urlFilter])

  // Location is enforced by the API via x-location-id (branch switcher reloads the page).
  const filteredConversations = useMemo(() => conversations, [conversations])

  const displayedConversations = useMemo(() => {
    const list = filteredConversations.filter((conv) => {
      const matchesSearch = getContactDisplayName(conv.contact)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const contactType = normalizeContactType(conv.contact.type)
      const matchesType = contactType === contactFilter
      return matchesSearch && matchesType
    })
    return list
  }, [filteredConversations, searchQuery, contactFilter])

  // Drop selection when the active filter/search hides the current conversation
  useEffect(() => {
    if (!selectedConversation) return
    const stillVisible = displayedConversations.some((c) => c.id === selectedConversation)
    if (!stillVisible) {
      setSelectedConversation(null)
      setShowContactList(true)
    }
  }, [displayedConversations, selectedConversation])

  // Counts for header tabs (from current branch-filtered list)
  const inboxTypeCounts = useMemo(() => {
    const counts = { customers: 0, leads: 0, teachers: 0 }
    for (const c of filteredConversations) {
      const t = normalizeContactType(c.contact.type)
      if (t === 'Customers') counts.customers += 1
      else if (t === 'Leads') counts.leads += 1
      else if (t === 'Teachers') counts.teachers += 1
    }
    return counts
  }, [filteredConversations])
  useEffect(() => {
    setInboxCounts(inboxTypeCounts)
  }, [inboxTypeCounts, setInboxCounts])
  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

  // Fetch full lead profile when conversation changes
  useEffect(() => {
    if (!selectedConversation) {
      setSelectedLeadData(null)
      return
    }
    const conv = conversations.find((c) => c.id === selectedConversation)
    const leadId = conv?.contact?.id
    if (!leadId || !selectedConversation.startsWith('lead-')) {
      setSelectedLeadData(null)
      return
    }
    let cancelled = false
    api.get(`/api/lead/${leadId}`).then((res) => {
      if (cancelled) return
      const lead = res.data || null
      setSelectedLeadData(lead)
      if (lead?.email || lead?.phoneNumber || lead?.stage || lead?.convertedCustomerID) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation
              ? {
                  ...c,
                  contact: {
                    ...c.contact,
                    email: lead.email || c.contact.email,
                    phoneNumber: lead.phoneNumber || c.contact.phoneNumber,
                    stage: lead.stage || c.contact.stage,
                    name: lead.name || c.contact.name,
                    type: resolveContactType(lead),
                    locationID: lead.locationID || c.contact.locationID || [],
                  },
                }
              : c,
          ),
        )
      }
    }).catch(() => {
      if (!cancelled) setSelectedLeadData(null)
    })
    return () => { cancelled = true }
  }, [selectedConversation, conversations])

  const selectedConvData = selectedConversation
    ? (displayedConversations.find((c) => c.id === selectedConversation) ||
      conversations.find((c) => c.id === selectedConversation))
    : null

  const conversationMessages = selectedConversation ? threadMessages[selectedConversation] || [] : []

  const revertOptimisticMessage = (convId, messageId) => {
    setThreadMessages((prev) => ({
      ...prev,
      [convId]: (prev[convId] || []).filter((m) => m.id !== messageId),
    }))
  }

  const handleSendMessage = async ({
    content,
    subject,
    channel,
    scheduleNow = true,
    scheduleDate = null,
    contentHtml = null,
  }) => {
    const convId = selectedConversationRef.current || selectedConversation
    if (!convId || !(String(contentHtml || content || '').trim())) return false

    const convFromUI =
      convId
        ? (displayedConversations.find((c) => c.id === convId) || conversations.find((c) => c.id === convId))
        : null

    // If the user just created a new conversation and sends immediately, the state update
    // from `handleNewConversation` may not have landed yet. In that case we still want
    // to optimistically create/update the conversation row.
    const fallbackContact = convFromUI?.contact || { id: convId, name: 'New conversation', type: 'Lead' }
    const effectiveChannel = channel || convFromUI?.channel || 'SMS'

    if (effectiveChannel === 'Email') {
      const leadRecipient = buildLeadRecipient(fallbackContact, selectedLeadData)
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
    const leadRecipient = buildLeadRecipient(fallbackContact, selectedLeadData)
    const personalizedContent =
      effectiveChannel === 'SMS'
        ? applyEmailTemplate(String(content || '').trim(), leadRecipient)
        : String(content || '').trim()
    // Optimistic bubble: personalize HTML locally; backend also personalizes on send.
    const personalizedHtml =
      contentHtml && effectiveChannel === 'Email'
        ? applyEmailTemplate(String(contentHtml).trim(), leadRecipient)
        : null
    // Send raw template HTML so the server can personalize (and track) per recipient.
    const htmlForSend =
      contentHtml && effectiveChannel === 'Email'
        ? String(contentHtml).trim()
        : null
    const displayContent =
      personalizedContent || htmlToPlainText(personalizedHtml || '')
    const newMessage = {
      id: messageId,
      sender: 'You',
      direction: 'outbound',
      content: displayContent,
      contentHtml: personalizedHtml || undefined,
      subject: effectiveChannel === 'Email' ? (subject || '').trim() : undefined,
      timestamp: new Date().toISOString(),
      channel: effectiveChannel,
    }

    setThreadMessages((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), newMessage],
    }))
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === convId)
      const nextRow = {
        id: convId,
        contact: fallbackContact,
        lastMessage:
          effectiveChannel === 'Email'
            ? subject || displayContent
            : displayContent,
        timestamp: newMessage.timestamp,
        unread: 0,
        channel: effectiveChannel,
      }

      const updated = exists
        ? prev.map((c) => (c.id === convId ? { ...c, ...nextRow } : c))
        : [nextRow, ...prev]

      return [...updated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    })

    if (effectiveChannel === 'Email') setEmailSending(true)
    else setSmsSending(true)

    try {
      if (isTalkToAssistant) {
        const fromNumber =
          selectedLeadData?.phoneNumber ||
          fallbackContact?.phoneNumber ||
          null
        const locationRaw = selectedLeadData?.locationID
        const locationID = Array.isArray(locationRaw)
          ? String(locationRaw[0]?._id ?? locationRaw[0] ?? '')
          : String(locationRaw?._id ?? locationRaw ?? '')

        if (!fromNumber) {
          revertOptimisticMessage(convId, messageId)
          toast.error({
            title: 'Missing phone',
            message: 'Select a lead with a phone number to message the assistant.',
          })
          return false
        }
        if (!locationID) {
          revertOptimisticMessage(convId, messageId)
          toast.error({
            title: 'Missing studio',
            message: 'Assign the lead to a studio, then add that studio’s phone in Settings → Studio.',
          })
          return false
        }

        const locationResult = await api.get(`/api/location/${encodeURIComponent(locationID)}`)
        const studio = locationResult?.data
        const toNumber = studio?.phoneNumber
        if (!locationResult.success || !toNumber || studio?.phoneStatus !== 'connected') {
          revertOptimisticMessage(convId, messageId)
          toast.error({
            title: 'Studio phone not connected',
            message: 'Add a Twilio number for this studio in Settings → Studio.',
          })
          return false
        }

        const assistantResult = await api.post('/api/sms/incoming_sms', {
          From: fromNumber,
          To: toNumber,
          Body: personalizedContent || content.trim(),
          MessageSid: `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        })
        const assistantReply =
          assistantResult?.data?.Response ||
          assistantResult?.data?.data?.Response ||
          assistantResult?.Response
        if (assistantReply && String(assistantReply).trim()) {
          const replyTimestamp = new Date().toISOString()
          const inboundMessage = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            sender: 'Assistant',
            direction: 'inbound',
            content: String(assistantReply).trim(),
            timestamp: replyTimestamp,
            channel: 'SMS',
          }

          setThreadMessages((prev) => ({
            ...prev,
            [convId]: [...(prev[convId] || []), inboundMessage],
          }))

          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    lastMessage: inboundMessage.content,
                    timestamp: replyTimestamp,
                    channel: 'SMS',
                  }
                : c
            )
            return [...updated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          })
        }
        return true
      } else if (effectiveChannel === 'SMS') {
        const phoneNumber = selectedLeadData?.phoneNumber || fallbackContact.phoneNumber
        if (!phoneNumber) {
          revertOptimisticMessage(convId, messageId)
          toast.error({
            title: 'Missing phone',
            message: 'This contact has no phone number on file.',
          })
          return false
        }

        const locationRaw = selectedLeadData?.locationID ?? fallbackContact.locationID
        const locationIDs = Array.isArray(locationRaw)
          ? locationRaw.map((l) => String(l?._id ?? l)).filter(Boolean)
          : locationRaw
            ? [String(locationRaw?._id ?? locationRaw)]
            : []

        const result = await api.post('/api/sms/send-one', {
          lead: {
            _id: fallbackContact.id || selectedLeadData?._id,
            phoneNumber,
            name: getContactDisplayName(selectedLeadData || fallbackContact),
            stage: selectedLeadData?.stage || fallbackContact.stage || '',
            locationID: locationIDs,
            email: selectedLeadData?.email || fallbackContact.email || '',
            location: selectedLeadData?.location || fallbackContact.location || '',
          },
          message: personalizedContent,
          scheduleNow,
          scheduleDate,
        })
        if (!result.success) {
          revertOptimisticMessage(convId, messageId)
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
      } else if (effectiveChannel === 'Email') {
        const payload = buildSendOneEmailPayload({
          lead: leadRecipient,
          subject,
          content: personalizedContent,
          html: htmlForSend,
          scheduleNow,
          scheduleDate,
        })
        const result = await api.post('/api/email/send-one', payload)
        if (!result.success) {
          revertOptimisticMessage(convId, messageId)
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
      }
      return false
    } catch (e) {
      console.error('Failed to queue message:', e)
      revertOptimisticMessage(convId, messageId)
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

  const handleNewConversation = ({ lead, channel }) => {
    const convId = lead._id
      ? `lead-${lead._id}`
      : channel === 'SMS'
        ? `sms-${String(lead.phoneNumber).replace(/\W/g, '_')}`
        : `email-${String(lead.email).replace(/\W/g, '_')}`

    // Make this conversation id available immediately for a fast send.
    selectedConversationRef.current = convId

    const contactTypeLabel = normalizeContactType(resolveContactType(lead)) || 'Leads'
    const filterParam =
      contactTypeLabel === 'Teachers'
        ? 'teachers'
        : contactTypeLabel === 'Customers'
          ? 'all'
          : 'leads'

    setConversations((prev) => {
      if (prev.find((c) => c.id === convId)) return prev
      return [{
        id: convId,
        contact: {
          id: lead._id,
          name: getContactDisplayName(lead),
          type: resolveContactType(lead),
          stage: lead.stage || '',
          nextVisit: '',
          phoneNumber: lead.phoneNumber,
          email: lead.email,
          locationID: lead.locationID || [],
        },
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unread: 0,
        channel,
      }, ...prev]
    })
    setThreadMessages((prev) => ({ ...prev, [convId]: prev[convId] || [] }))
    setSelectedConversation(convId)
    // Ensure the newly created thread is visible under the matching type tab.
    setSearchQuery('')
    setContactFilter(contactTypeLabel)
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('filter', filterParam)
    router.replace(`${pathname}?${params.toString()}`)
    setShowContactList(false)
  }

  const filterRecordsByRecipient = (records, contactEmail) => {
    const normalized = normalizeEmailAddress(contactEmail)
    if (!normalized) return records
    return records.filter(
      (r) => normalizeEmailAddress(r.to || r.email || r.leadID?.email) === normalized,
    )
  }

  const fetchConversationEmailHistory = useCallback(async (conversationId) => {
    if (!conversationId) return
    if (emailHistoryLoadedRef.current.has(conversationId)) return
    emailHistoryLoadedRef.current.add(conversationId)

    const conv = conversations.find((c) => c.id === conversationId)
    const contactEmail = conv?.contact?.email || ''

    try {
      let records = []
      const allRes = await api.get('/api/emailHistory?limit=200')
      const allRecords = Array.isArray(allRes.data) ? allRes.data : []

      if (conversationId.startsWith('lead-')) {
        const leadID = conversationId.replace('lead-', '')
        const byLeadRes = await api.get(`/api/emailHistory?leadID=${leadID}&limit=200`)
        const leadRecords = Array.isArray(byLeadRes.data) ? byLeadRes.data : []
        const byEmail = filterRecordsByRecipient(allRecords, contactEmail)
        const seen = new Set()
        records = [...leadRecords, ...byEmail].filter((r) => {
          if (seen.has(r._id)) return false
          seen.add(r._id)
          return true
        })
      } else if (conversationId.startsWith('email-') && contactEmail) {
        records = filterRecordsByRecipient(allRecords, contactEmail)
      }

      const emailMsgs = records.map(mapEmailHistoryRecord)
      setThreadMessages((prev) => {
        const existing = prev[conversationId] || []
        const smsOnly = existing.filter((m) => m.channel === 'SMS')
        const callOnly = existing.filter((m) => m.channel === 'Call')
        return {
          ...prev,
          [conversationId]: mergeThreadByTimestamp(smsOnly, emailMsgs, callOnly),
        }
      })
    } catch (e) {
      emailHistoryLoadedRef.current.delete(conversationId)
      console.error('Failed to load email history:', e)
    }
  }, [conversations])

  const fetchConversationCallHistory = useCallback(async (conversationId, { force = false } = {}) => {
    if (!conversationId) return
    if (!force) {
      if (callHistoryInFlightRef.current === conversationId) return
      if (callHistoryLoadedRef.current.has(conversationId)) return
    }

    const requestId = (callHistoryRequestIdRef.current[conversationId] || 0) + 1
    callHistoryRequestIdRef.current[conversationId] = requestId

    const conv =
      conversations.find((c) => c.id === conversationId) ||
      null
    const leadID = conversationId.startsWith('lead-')
      ? conversationId.replace('lead-', '')
      : conv?.contact?.id || selectedLeadData?._id || null
    const phoneNumber = conv?.contact?.phoneNumber || selectedLeadData?.phoneNumber || ''

    if (!leadID && !phoneNumber) return

    callHistoryInFlightRef.current = conversationId
    setCallLogsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (leadID) params.set('leadID', String(leadID))
      else if (phoneNumber) params.set('phoneNumber', String(phoneNumber))

      const [humanRes, aiRes] = await Promise.all([
        api.get(`/api/human-call/history?${params.toString()}`),
        leadID
          ? api.get(`/api/ai-calling?leadID=${encodeURIComponent(leadID)}&limit=100`)
          : Promise.resolve({ success: false, data: [] }),
      ])

      if (callHistoryRequestIdRef.current[conversationId] !== requestId) return

      const humanCalls = Array.isArray(humanRes.data) ? humanRes.data : []
      const aiCalls = Array.isArray(aiRes.data) ? aiRes.data : []

      const callMsgs = [
        ...humanCalls.map(mapHumanCallToMessage),
        ...aiCalls.map(mapAiCallToMessage),
      ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

      setThreadMessages((prev) => {
        const existing = prev[conversationId] || []
        const smsOnly = existing.filter((m) => m.channel === 'SMS')
        const emailOnly = existing.filter((m) => m.channel === 'Email')
        // Keep recording flags if a later refresh races ahead of Twilio webhook.
        const priorCalls = existing.filter((m) => m.channel === 'Call')
        const priorByRecordId = new Map(
          priorCalls
            .filter((m) => m.callRecordId)
            .map((m) => [String(m.callRecordId), m]),
        )
        const priorById = new Map(priorCalls.map((m) => [String(m.id), m]))
        const mergedCalls = callMsgs.map((msg) => {
          const prior =
            (msg.callRecordId && priorByRecordId.get(String(msg.callRecordId))) ||
            priorById.get(String(msg.id))
          if (prior?.hasRecording && !msg.hasRecording) {
            return {
              ...msg,
              hasRecording: true,
              recordingUrl: msg.recordingUrl || prior.recordingUrl || '',
              callRecordId: msg.callRecordId || prior.callRecordId || null,
            }
          }
          return msg
        })
        return {
          ...prev,
          [conversationId]: mergeThreadByTimestamp(smsOnly, emailOnly, mergedCalls),
        }
      })
      callHistoryLoadedRef.current.add(conversationId)
    } catch (e) {
      if (callHistoryRequestIdRef.current[conversationId] === requestId) {
        callHistoryLoadedRef.current.delete(conversationId)
      }
      console.error('Failed to load call history:', e)
    } finally {
      if (callHistoryRequestIdRef.current[conversationId] === requestId) {
        if (callHistoryInFlightRef.current === conversationId) {
          callHistoryInFlightRef.current = null
        }
        setCallLogsLoading(false)
      }
    }
  }, [conversations, selectedLeadData])

  const scheduleCallLogRefresh = useCallback((conversationId) => {
    if (!conversationId) return
    // Per-conversation timers — ending a new call must not cancel backfill for
    // an earlier conversation (or wipe a pending recording refresh).
    const timersMap = callLogRefreshTimersRef.current
    const existing = timersMap.get(conversationId) || []
    existing.forEach((t) => clearTimeout(t))

    const run = () => {
      callHistoryLoadedRef.current.delete(conversationId)
      fetchConversationCallHistory(conversationId, { force: true })
    }
    run()
    // Twilio often finalizes conference recordings a few seconds after hangup.
    timersMap.set(conversationId, [
      setTimeout(run, 2500),
      setTimeout(run, 6000),
      setTimeout(run, 12000),
    ])
  }, [fetchConversationCallHistory])

  useEffect(() => () => {
    callLogRefreshTimersRef.current.forEach((timers) => {
      timers.forEach((t) => clearTimeout(t))
    })
    callLogRefreshTimersRef.current.clear()
  }, [])

  useEffect(() => {
    activeOutboundConnectionRef.current = activeOutboundConnection
  }, [activeOutboundConnection])

  const handleCallTabActive = useCallback(() => {
    const convId = selectedConversationRef.current || selectedConversation
    if (convId) fetchConversationCallHistory(convId)
  }, [selectedConversation, fetchConversationCallHistory])

  const handleEmailTabActive = useCallback(() => {
    const convId = selectedConversationRef.current || selectedConversation
    if (convId?.startsWith('lead-') || convId?.startsWith('email-')) {
      fetchConversationEmailHistory(convId)
    }
  }, [selectedConversation, fetchConversationEmailHistory])

  const clearOutboundCallUi = useCallback(() => {
    setActiveOutboundCall(null)
    setActiveOutboundConnection(null)
    setOutboundCallStatus('connecting')
  }, [])

  const handleEndOutboundCall = useCallback(async (opts = {}) => {
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
      const convId = selectedConversationRef.current || selectedConversation
      scheduleCallLogRefresh(convId)
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
  }, [
    activeOutboundCall,
    activeOutboundConnection,
    clearOutboundCallUi,
    selectedConversation,
    scheduleCallLogRefresh,
    toast,
  ])

  useEffect(() => {
    endOutboundCallRef.current = handleEndOutboundCall
  }, [handleEndOutboundCall])

  const handlePlaceCall = useCallback(async () => {
    const convId = selectedConversationRef.current || selectedConversation
    if (!convId) return
    if (activeOutboundCall) {
      toast.error({
        title: 'Call in progress',
        message: 'End the current call before placing another.',
      })
      return
    }

    const conv =
      displayedConversations.find((c) => c.id === convId) ||
      conversations.find((c) => c.id === convId)
    const contact = {
      ...(conv?.contact || {}),
      ...(selectedLeadData || {}),
    }
    const phoneNumber = contact.phoneNumber || conv?.contact?.phoneNumber
    if (!phoneNumber) {
      toast.error({
        title: 'Missing phone',
        message: 'This contact has no phone number on file.',
      })
      return
    }

    setCallPlacing(true)
    endingOutboundRef.current = false
    let callHistoryId = null
    try {
      const locationRaw = contact.locationID || selectedLeadData?.locationID || []
      const locationIDs = Array.isArray(locationRaw)
        ? locationRaw.map((l) => String(l?._id ?? l)).filter(Boolean)
        : locationRaw
          ? [String(locationRaw?._id ?? locationRaw)]
          : []
      const leadPayload = {
        _id: contact._id || contact.id || (convId.startsWith('lead-') ? convId.replace('lead-', '') : undefined),
        phoneNumber,
        name: getContactDisplayName(contact),
        locationID: locationIDs,
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

      const panelCall = {
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
      }

      setActiveOutboundCall(panelCall)
      setOutboundCallStatus('connecting')

      if (conferenceName) {
        try {
          const {
            joinConferenceCall,
            subscribeToConnectionEvents,
          } = await import('@/lib/twilioVoiceClient')
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
          scheduleCallLogRefresh(convId)
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

      callHistoryLoadedRef.current.delete(convId)

      setThreadMessages((prev) => {
        const existing = prev[convId] || []
        const withoutDup = existing.filter((m) => m.id !== callMsg.id)
        return {
          ...prev,
          [convId]: mergeThreadByTimestamp(
            withoutDup.filter((m) => m.channel === 'SMS'),
            withoutDup.filter((m) => m.channel === 'Email'),
            [...withoutDup.filter((m) => m.channel === 'Call'), callMsg],
          ),
        }
      })

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === convId)
        const nextRow = {
          id: convId,
          contact: conv?.contact || {
            id: leadPayload._id,
            name: leadPayload.name,
            type: resolveContactType(contact),
            phoneNumber,
            email: contact.email || '',
          },
          lastMessage: callMsg.content,
          timestamp: callMsg.timestamp,
          unread: 0,
          channel: 'Call',
        }
        const updated = exists
          ? prev.map((c) => (c.id === convId ? { ...c, ...nextRow } : c))
          : [nextRow, ...prev]
        return [...updated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      })

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
    selectedConversation,
    displayedConversations,
    conversations,
    selectedLeadData,
    toast,
    clearOutboundCallUi,
    scheduleCallLogRefresh,
  ])

  // Poll so contact hangup closes the CRM panel even if the Voice SDK lag.
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

  const fetchLeadMessages = useCallback(async (conversationId, page = 1) => {
    const leadID = conversationId.replace('lead-', '')
    const convName = conversations.find((c) => c.id === conversationId)?.contact?.name || 'Lead'
    const pageKey = `${conversationId}:${page}`
    if (smsPageInFlightRef.current.has(pageKey)) return
    smsPageInFlightRef.current.add(pageKey)

    setThreadMeta((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: true } }))
    try {
      const res = await api.get(`/api/smsHistory/conversations/${leadID}?page=${page}`)
      const msgs = Array.isArray(res.data?.messages) ? res.data.messages : []
      const mapped = msgs.map((m) => ({
        id: String(m._id),
        sender: m.status === 'received' ? convName : 'You',
        direction: m.status === 'received' ? 'inbound' : 'outbound',
        content: m.message,
        timestamp: m.createdAt,
        channel: 'SMS',
      }))
      setThreadMessages((prev) => {
        const existing = prev[conversationId] || []
        const existingEmail = existing.filter((m) => m.channel === 'Email')
        const existingCall = existing.filter((m) => m.channel === 'Call')
        // Keep optimistic SMS (non-ObjectId ids) on page-1 refresh until they appear in history.
        const existingSms = existing.filter((m) => m.channel === 'SMS')
        const optimisticSms =
          page === 1
            ? existingSms.filter((m) => !mapped.some((s) => s.id === m.id) && !/^[a-f\d]{24}$/i.test(String(m.id)))
            : []
        const smsSlice =
          page === 1
            ? mergeSmsPages(mapped, optimisticSms)
            : mergeSmsPages(mapped, existingSms)
        return {
          ...prev,
          [conversationId]: mergeThreadByTimestamp(smsSlice, existingEmail, existingCall),
        }
      })
      setThreadMeta((prev) => ({
        ...prev,
        [conversationId]: { page, hasMore: res.data?.hasMore ?? false, loading: false },
      }))
      if (page === 1) {
        fetchConversationEmailHistory(conversationId)
      }
    } catch {
      setThreadMeta((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: false } }))
      if (page === 1) {
        fetchConversationEmailHistory(conversationId)
      }
    } finally {
      smsPageInFlightRef.current.delete(pageKey)
    }
  }, [conversations, fetchConversationEmailHistory])

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId)
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv)))
    setShowContactList(false)
    if (!isLgUp) setShowDetails(false)
    if (conversationId.startsWith('lead-')) {
      fetchLeadMessages(conversationId, 1)
    } else if (conversationId.startsWith('email-')) {
      fetchConversationEmailHistory(conversationId)
    }
  }

  const loadMoreMessages = useCallback(() => {
    if (!selectedConversation?.startsWith('lead-')) return
    const meta = threadMeta[selectedConversation]
    if (!meta?.hasMore || meta?.loading) return
    fetchLeadMessages(selectedConversation, meta.page + 1)
  }, [selectedConversation, threadMeta, fetchLeadMessages])

  useEffect(() => {
    // Desktop: keep a conversation selected. Mobile: stay on the list until the user picks one.
    if (!isLgUp) return
    if (!selectedConversation && displayedConversations.length > 0) {
      const firstId = displayedConversations[0].id
      setSelectedConversation(firstId)
      if (firstId.startsWith('lead-')) fetchLeadMessages(firstId, 1)
      else if (firstId.startsWith('email-')) fetchConversationEmailHistory(firstId)
    }
  }, [displayedConversations, selectedConversation, fetchLeadMessages, fetchConversationEmailHistory, isLgUp])

  if (loading) {
    return (
      <MainLayout title="Inbox" subtitle="Manage all your conversations in one place" mainClassName="overflow-hidden flex flex-col">
        <div className="flex items-center justify-center flex-1 min-h-0">
          <GlobalLoader variant="center" size="md" text="Loading conversations…" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Inbox" subtitle="Manage all your conversations in one place" mainClassName="overflow-hidden flex flex-col">
        <div className="flex flex-col items-center justify-center flex-1 min-h-0 gap-3 text-muted-foreground">
          <p>{error}</p>
          <button onClick={fetchInboxData} className="text-sm underline">Retry</button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Inbox" subtitle="Manage all your conversations in one place" mainClassName="overflow-hidden flex flex-col !px-0 !py-0 sm:!px-0 sm:!py-0 lg:!px-2 lg:!py-2">
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
      <NewConversationDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onStart={handleNewConversation}
        contactType={contactFilter}
      />
      <BatchSendDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onSent={handleBatchSent}
        contactType={contactFilter}
      />
      <div className="flex flex-col lg:flex-row gap-0 h-full min-h-0 flex-1">
        {/* Left: Contact list — full screen on mobile until a thread is opened */}
        <div
          className={cn(
            'h-full min-h-0',
            showContactList ? 'flex flex-col' : 'hidden',
            'lg:flex lg:flex-col',
          )}
        >
          <ContactList
            conversations={displayedConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            contactFilter={contactFilter}
            onContactFilterChange={setContactFilter}
            onNewConversation={() => setNewConvOpen(true)}
            onBatchSend={() => setBatchOpen(true)}
          />
        </div>

        {/* Middle: Conversation — hidden on mobile while the list is visible */}
        <div
          className={cn(
            'flex-col min-h-0 h-full w-full lg:flex-1',
            showContactList ? 'hidden lg:flex' : 'flex',
          )}
        >
          <ConversationView
            conversation={selectedConvData}
            messages={conversationMessages}
            onToggleDetails={() => setShowDetails(!showDetails)}
            showDetails={showDetails}
            onSendMessage={handleSendMessage}
            onBackClick={() => setShowContactList(true)}
            onLoadMore={loadMoreMessages}
            hasMore={threadMeta[selectedConversation]?.hasMore ?? false}
            loadingMore={threadMeta[selectedConversation]?.loading ?? false}
            leadData={selectedLeadData}
            emailSending={emailSending}
            smsSending={smsSending}
            callPlacing={callPlacing}
            callLogsLoading={callLogsLoading}
            onPlaceCall={handlePlaceCall}
            onEmailTabActive={handleEmailTabActive}
            onCallTabActive={handleCallTabActive}
          />
        </div>

        {/* Right: Details — desktop side panel */}
        {showDetails && selectedConvData && (
          <div className="hidden lg:flex flex-col w-80 min-h-0 h-full">
            <ContactDetails contact={selectedConvData.contact} leadData={selectedLeadData} onClose={() => setShowDetails(false)} />
          </div>
        )}

        {/* Mobile / tablet: details as full-height sheet */}
        <Sheet open={!isLgUp && showDetails && !!selectedConvData} onClose={() => setShowDetails(false)} side="right">
          <SheetContent className="p-0">
            {selectedConvData && (
              <ContactDetails
                contact={selectedConvData.contact}
                leadData={selectedLeadData}
                onClose={() => setShowDetails(false)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Inbox" subtitle="Manage all your conversations in one place" mainClassName="overflow-hidden flex flex-col">
        <div className="flex items-center justify-center flex-1 min-h-0">
          <GlobalLoader variant="center" size="md" text="Loading conversations…" />
        </div>
      </MainLayout>
    }>
      <InboxPageContent />
    </Suspense>
  )
}
