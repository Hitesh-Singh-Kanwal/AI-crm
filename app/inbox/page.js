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
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import GlobalLoader from '@/components/shared/GlobalLoader'

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
    const key = lead?._id ? `lead-${lead._id}` : `email-${String(rec.email).replace(/\W/g, '_')}`
    if (!contactGroups[key]) {
      contactGroups[key] = {
        contact: {
          id: lead?._id || rec.email,
          name: lead?.name || rec.email,
          type: 'Lead',
          stage: '',
          nextVisit: '',
          phoneNumber: '',
          email: rec.email || '',
        },
        messages: [],
      }
    } else {
      if (rec.email && !contactGroups[key].contact.email) {
        contactGroups[key].contact.email = rec.email
      }
    }
    contactGroups[key].messages.push({
      id: rec._id,
      sender: 'You',
      direction: 'outbound',
      content: rec.body,
      timestamp: rec.createdAt,
      channel: 'Email',
    })
  }

  for (const [convId, group] of Object.entries(contactGroups)) {
    const sortedMessages = [...group.messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const latest = sortedMessages[sortedMessages.length - 1]
    conversations.push({
      id: convId,
      contact: group.contact,
      lastMessage: latest.content,
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

function InboxPageContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isTalkToAssistant = pathname === '/inbox/talk-to-assistant'
  const { setInboxTeachersCount } = useInboxHeader()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [showContactList, setShowContactList] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState('All')
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
          name: lead.name,
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
        api.get('/api/sms/conversations'),
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
          contact: { id: conv.leadID, name: conv.name, type: 'Lead', stage: '', nextVisit: '', phoneNumber: '', email: '' },
          lastMessage: conv.lastMessage,
          timestamp: conv.lastMessageAt,
          unread: 0,
          channel: 'SMS',
        }
      })

      // Build email conversations from history
      const { conversations: emailConvs, threadMessages: emailThreads } = buildInboxData([], emailRecords)

      // Only add email threads for leads that have no SMS conversation
      const smsLeadIds = new Set(smsConversations.map((c) => c.id))
      for (const [key, msgs] of Object.entries(emailThreads)) {
        if (!smsLeadIds.has(key)) threads[key] = msgs
      }

      // Deduplicate by id — SMS entry wins, email fills in missing leads
      const uniqueEmailConvs = emailConvs.filter((c) => !smsLeadIds.has(c.id))
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
      const matchesChannel = selectedChannel === 'All' || conv.channel === selectedChannel
      const matchesSearch = conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = contactFilter === 'All' || normalizeContactType(conv.contact.type) === contactFilter
      return matchesChannel && matchesSearch && matchesType
    })
    return list
  }, [filteredConversations, selectedChannel, searchQuery, contactFilter])

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
      if (!cancelled) setSelectedLeadData(res.data || null)
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

    // Optimistic update
    const newMessage = {
      id: `${Date.now()}`,
      sender: 'You',
      direction: 'outbound',
      content: content.trim(),
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

      // Keep newest conversations at the top, like the initial fetch does.
      return [...updated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    })

    // Send via Talk to Assistant endpoint or existing scheduler endpoints
    try {
      if (isTalkToAssistant) {
        const assistantResult = await api.post('/api/sms/incoming_sms', {
          From: '+919935638678',
          To: '+18777302307',
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
        await api.post('/api/email/send-one', {
          lead: { _id: fallbackContact.id, email: fallbackContact.email || fallbackContact.name },
          subject: subject || '(no subject)',
          body: content.trim(),
          scheduleNow,
          scheduleDate,
        })
      }
    } catch (e) {
      console.error('Failed to queue message:', e)
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
        contact: { id: lead._id, name: lead.name, type: 'Lead', stage: '', nextVisit: '', phoneNumber: lead.phoneNumber, email: lead.email },
        lastMessage: '',
        timestamp: new Date().toISOString(),
        unread: 0,
        channel,
      }, ...prev]
    })
    setThreadMessages((prev) => ({ ...prev, [convId]: prev[convId] || [] }))
    setSelectedConversation(convId)
    // Ensure the newly created thread is visible immediately even if the user has filters applied.
    setSelectedChannel('All')
    setSearchQuery('')
    setContactFilter('All')
    setShowContactList(false)
  }

  const fetchLeadMessages = useCallback(async (conversationId, page = 1) => {
    const leadID = conversationId.replace('lead-', '')
    const convName = conversations.find((c) => c.id === conversationId)?.contact?.name || 'Lead'
    setThreadMeta((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: true } }))
    try {
      const res = await api.get(`/api/sms/conversations/${leadID}?page=${page}`)
      const msgs = Array.isArray(res.data?.messages) ? res.data.messages : []
      const mapped = msgs.map((m) => ({
        id: m._id,
        sender: m.status === 'received' ? convName : 'You',
        direction: m.status === 'received' ? 'inbound' : 'outbound',
        content: m.message,
        timestamp: m.createdAt,
        channel: 'SMS',
      }))
      setThreadMessages((prev) => ({
        ...prev,
        [conversationId]: page === 1 ? mapped : [...mapped, ...(prev[conversationId] || [])],
      }))
      setThreadMeta((prev) => ({
        ...prev,
        [conversationId]: { page, hasMore: res.data?.hasMore ?? false, loading: false },
      }))
    } catch {
      setThreadMeta((prev) => ({ ...prev, [conversationId]: { ...prev[conversationId], loading: false } }))
    }
  }, [conversations])

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId)
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv)))
    setShowContactList(false)
    if (conversationId.startsWith('lead-')) {
      fetchLeadMessages(conversationId, 1)
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
    }
  }, [displayedConversations, selectedConversation, fetchLeadMessages])

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
            selectedChannel={selectedChannel}
            onChannelChange={setSelectedChannel}
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
