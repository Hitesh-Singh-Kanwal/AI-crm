'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ContactList from '@/app/inbox/components/ContactList'
import ConversationView from '@/app/inbox/components/ConversationView'
import ContactDetails from '@/app/inbox/components/ContactDetails'
import NewConversationDialog from '@/app/inbox/components/NewConversationDialog'
import BatchSendDialog from '@/app/inbox/components/BatchSendDialog'
import { useInboxHeader } from '@/contexts/InboxHeaderContext'
import { cn, getContactDisplayName } from '@/lib/utils'
import api from '@/lib/api'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { useToast } from '@/components/ui/toast'
import {
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
          type: 'Lead',
          stage: '',
          nextVisit: '',
          phoneNumber: resolvedPhone,
          email: '',
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
          type: 'Lead',
          stage: lead?.stage || '',
          nextVisit: '',
          phoneNumber: lead?.phoneNumber || '',
          email,
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
    const sortedMessages = [...group.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
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
  const t = type.toLowerCase()
  if (t === 'customer') return 'Customers'
  if (t === 'lead') return 'Leads'
  if (t === 'teacher') return 'Teachers'
  return type
}

function mergeThreadByTimestamp(smsMessages = [], emailMessages = []) {
  return [...smsMessages, ...emailMessages].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  )
}

function InboxPageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isTalkToAssistant = pathname === '/inbox/talk-to-assistant'
  const { setInboxTeachersCount } = useInboxHeader()
  const toast = useToast()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [showContactList, setShowContactList] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [contactFilter, setContactFilter] = useState('All')
  const [conversations, setConversations] = useState([])
  const [threadMessages, setThreadMessages] = useState({})
  const [threadMeta, setThreadMeta] = useState({}) // { [convId]: { page, hasMore, loading } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [selectedLeadData, setSelectedLeadData] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const selectedConversationRef = useRef(null)

  const upsertConversationAndAppendMessage = useCallback((payload) => {
    const { convId, contact, channel, content, subject, timestamp } = payload

    const effectiveChannel = channel === 'Email' ? 'Email' : 'SMS'
    const lastMessage = effectiveChannel === 'Email' ? (subject || content) : content

    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender: 'You',
      direction: 'outbound',
      content,
      subject: effectiveChannel === 'Email' ? subject : undefined,
      timestamp,
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
          type: 'Lead',
          stage: '',
          nextVisit: '',
          phoneNumber: lead.phoneNumber,
          email: lead.email,
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
            type: 'Lead',
            stage: '',
            nextVisit: '',
            phoneNumber: conv.phoneNumber || '',
            email: conv.email || '',
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

  // Sync URL ?filter= with contactFilter (header tabs use URL)
  const urlFilter = searchParams?.get('filter') || 'all'
  useEffect(() => {
    const map = { all: 'All', leads: 'Leads', teachers: 'Teachers' }
    setContactFilter(map[urlFilter] ?? 'All')
  }, [urlFilter])

  const filteredConversations = useMemo(() => conversations, [conversations])

  const displayedConversations = useMemo(() => {
    const list = filteredConversations.filter((conv) => {
      const matchesSearch = getContactDisplayName(conv.contact)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      const matchesType = contactFilter === 'All' || normalizeContactType(conv.contact.type) === contactFilter
      return matchesSearch && matchesType
    })
    return list
  }, [filteredConversations, searchQuery, contactFilter])

  // Teachers count for header tab (from current branch-filtered list)
  const teachersCount = useMemo(
    () => filteredConversations.filter((c) => normalizeContactType(c.contact.type) === 'Teachers').length,
    [filteredConversations]
  )
  useEffect(() => {
    setInboxTeachersCount(teachersCount)
  }, [teachersCount, setInboxTeachersCount])


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
      if (lead?.email || lead?.phoneNumber) {
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

  const handleSendMessage = async ({ content, subject, channel, scheduleNow = true, scheduleDate = null }) => {
    const convId = selectedConversationRef.current || selectedConversation
    if (!convId || !content.trim()) return

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
        scheduleNow,
        scheduleDate,
      })
      if (validationError) {
        toast.error({ title: 'Cannot send email', message: validationError })
        return
      }
    }

    const messageId = `${Date.now()}`
    const newMessage = {
      id: messageId,
      sender: 'You',
      direction: 'outbound',
      content: content.trim(),
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
        lastMessage: effectiveChannel === 'Email' ? (subject || content.trim()) : content.trim(),
        timestamp: newMessage.timestamp,
        unread: 0,
        channel: effectiveChannel,
      }

      const updated = exists
        ? prev.map((c) => (c.id === convId ? { ...c, ...nextRow } : c))
        : [nextRow, ...prev]

      return [...updated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    })

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
          toast.error({
            title: 'Missing phone',
            message: 'Select a lead with a phone number to message the assistant.',
          })
          return
        }
        if (!locationID) {
          toast.error({
            title: 'Missing studio',
            message: 'Assign the lead to a studio, then connect that studio phone in Settings → Integrations.',
          })
          return
        }

        const phoneStatus = await api.get(
          `/api/location-phone/status?locationID=${encodeURIComponent(locationID)}`,
        )
        const toNumber = phoneStatus?.data?.twilioNumber
        if (!phoneStatus.success || !toNumber || phoneStatus.data?.status !== 'connected') {
          toast.error({
            title: 'Studio phone not connected',
            message: 'Connect a Twilio number for this studio in Settings → Integrations.',
          })
          return
        }

        const assistantResult = await api.post('/api/sms/incoming_sms', {
          From: fromNumber,
          To: toNumber,
          Body: content.trim(),
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
      } else if (effectiveChannel === 'SMS') {
        await api.post('/api/sms/send-one', {
          lead: { _id: fallbackContact.id, phoneNumber: fallbackContact.phoneNumber || fallbackContact.name },
          message: content.trim(),
          scheduleNow,
          scheduleDate,
        })
      } else if (effectiveChannel === 'Email') {
        setEmailSending(true)
        const leadRecipient = buildLeadRecipient(fallbackContact, selectedLeadData)
        const payload = buildSendOneEmailPayload({
          lead: leadRecipient,
          subject,
          content,
          scheduleNow,
          scheduleDate,
        })
        const result = await api.post('/api/email/send-one', payload)
        if (!result.success) {
          revertOptimisticMessage(convId, messageId)
          toast.error({
            title: 'Email not sent',
            message: result.error || 'Could not schedule email.',
          })
          return
        }
        toast.success({
          title: scheduleNow ? 'Email scheduled' : 'Email scheduled for later',
          message: result.message || 'Email scheduled successfully',
        })
      }
    } catch (e) {
      console.error('Failed to queue message:', e)
      if (effectiveChannel === 'Email') {
        revertOptimisticMessage(convId, messageId)
        toast.error({ title: 'Email not sent', message: 'Something went wrong. Please try again.' })
      }
    } finally {
      if (effectiveChannel === 'Email') setEmailSending(false)
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

    setConversations((prev) => {
      if (prev.find((c) => c.id === convId)) return prev
      return [{
        id: convId,
        contact: {
          id: lead._id,
          name: getContactDisplayName(lead),
          type: 'Lead',
          stage: '',
          nextVisit: '',
          phoneNumber: lead.phoneNumber,
          email: lead.email,
        },
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unread: 0,
        channel,
      }, ...prev]
    })
    setThreadMessages((prev) => ({ ...prev, [convId]: prev[convId] || [] }))
    setSelectedConversation(convId)
    // Ensure the newly created thread is visible immediately even if the user has filters applied.
    setSearchQuery('')
    setContactFilter('All')
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
        return {
          ...prev,
          [conversationId]: mergeThreadByTimestamp(smsOnly, emailMsgs),
        }
      })
    } catch (e) {
      console.error('Failed to load email history:', e)
    }
  }, [conversations])

  const fetchLeadMessages = useCallback(async (conversationId, page = 1) => {
    const leadID = conversationId.replace('lead-', '')
    const convName = conversations.find((c) => c.id === conversationId)?.contact?.name || 'Lead'
    setThreadMeta((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: true } }))
    try {
      const res = await api.get(`/api/smsHistory/conversations/${leadID}?page=${page}`)
      const msgs = Array.isArray(res.data?.messages) ? res.data.messages : []
      const mapped = msgs.map((m) => ({
        id: m._id,
        sender: m.status === 'received' ? convName : 'You',
        direction: m.status === 'received' ? 'inbound' : 'outbound',
        content: m.message,
        timestamp: m.createdAt,
        channel: 'SMS',
      }))
      setThreadMessages((prev) => {
        const existingEmail = (prev[conversationId] || []).filter((m) => m.channel === 'Email')
        const smsSlice = page === 1 ? mapped : [...mapped, ...(prev[conversationId] || []).filter((m) => m.channel === 'SMS')]
        return {
          ...prev,
          [conversationId]: mergeThreadByTimestamp(smsSlice, existingEmail),
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
    }
  }, [conversations, fetchConversationEmailHistory])

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId)
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv)))
    setShowContactList(false)
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
    if (!selectedConversation && displayedConversations.length > 0) {
      const firstId = displayedConversations[0].id
      setSelectedConversation(firstId)
      if (firstId.startsWith('lead-')) fetchLeadMessages(firstId, 1)
      else if (firstId.startsWith('email-')) fetchConversationEmailHistory(firstId)
    }
  }, [displayedConversations, selectedConversation, fetchLeadMessages, fetchConversationEmailHistory])

  if (loading) {
    return (
      <MainLayout title="Inbox" subtitle="Manage all your conversations in one place">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <GlobalLoader variant="center" size="md" text="Loading conversations…" />
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Inbox" subtitle="Manage all your conversations in one place">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-3 text-muted-foreground">
          <p>{error}</p>
          <button onClick={fetchInboxData} className="text-sm underline">Retry</button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title="Inbox" subtitle="Manage all your conversations in one place">
      <NewConversationDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onStart={handleNewConversation}
      />
      <BatchSendDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onSent={handleBatchSent}
      />
      <div className="flex flex-col lg:flex-row gap-0 h-full min-h-0">
        {/* Left: Contact list */}
        <div className={cn('h-full min-h-0', showContactList ? 'flex flex-col' : 'hidden lg:flex flex-col')}>
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

        {/* Middle: Conversation */}
        <div className="flex flex-col min-h-0 h-full w-full lg:flex-1">
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
            onEmailTabActive={() => {
              if (
                selectedConversation?.startsWith('lead-') ||
                selectedConversation?.startsWith('email-')
              ) {
                fetchConversationEmailHistory(selectedConversation)
              }
            }}
          />
        </div>

        {/* Right: Details */}
        {showDetails && selectedConvData && (
          <div className="hidden lg:flex flex-col w-80 min-h-0 h-full">
            <ContactDetails contact={selectedConvData.contact} leadData={selectedLeadData} onClose={() => setShowDetails(false)} />
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <MainLayout title="Inbox" subtitle="Manage all your conversations in one place">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <GlobalLoader variant="center" size="md" text="Loading conversations…" />
        </div>
      </MainLayout>
    }>
      <InboxPageContent />
    </Suspense>
  )
}
