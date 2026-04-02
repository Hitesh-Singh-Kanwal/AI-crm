'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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

  // Group SMS records by phoneNumber → one conversation per contact
  const smsGroups = {}
  for (const rec of smsRecords) {
    const key = rec.phoneNumber
    if (!smsGroups[key]) smsGroups[key] = []
    smsGroups[key].push(rec)
  }
  for (const [phone, records] of Object.entries(smsGroups)) {
    const convId = `sms-${phone.replace(/\W/g, '_')}`
    const latest = records[0]
    const lead = latest.leadID
    conversations.push({
      id: convId,
      contact: { id: lead?._id || phone, name: lead?.name || phone, type: 'Lead', stage: '', nextVisit: '', phoneNumber: phone },
      lastMessage: latest.message,
      timestamp: latest.createdAt,
      unread: 0,
      channel: 'SMS',
    })
    threadMessages[convId] = [...records].reverse().map((rec) => ({
      id: rec._id,
      sender: 'You',
      direction: 'outbound',
      content: rec.message,
      timestamp: rec.createdAt,
      channel: 'SMS',
    }))
  }

  // Group Email records by email address → one conversation per contact
  const emailGroups = {}
  for (const rec of emailRecords) {
    const key = rec.email
    if (!emailGroups[key]) emailGroups[key] = []
    emailGroups[key].push(rec)
  }
  for (const [email, records] of Object.entries(emailGroups)) {
    const convId = `email-${email.replace(/\W/g, '_')}`
    const latest = records[0]
    const lead = latest.leadID
    conversations.push({
      id: convId,
      contact: { id: lead?._id || email, name: lead?.name || email, type: 'Lead', stage: '', nextVisit: '', email },
      lastMessage: latest.subject,
      timestamp: latest.createdAt,
      unread: 0,
      channel: 'Email',
    })
    threadMessages[convId] = [...records].reverse().map((rec) => ({
      id: rec._id,
      sender: 'You',
      direction: 'outbound',
      content: rec.body,
      timestamp: rec.createdAt,
      channel: 'Email',
    }))
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
  const searchParams = useSearchParams()
  const { setInboxTeachersCount } = useInboxHeader()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [showContactList, setShowContactList] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [contactFilter, setContactFilter] = useState('All')
  const [conversations, setConversations] = useState([])
  const [threadMessages, setThreadMessages] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
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
      const convId = channel === 'SMS'
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
        api.get('/api/smsHistory?limit=200'),
        api.get('/api/emailHistory?limit=200'),
      ])
      const smsRecords = Array.isArray(smsResult.data) ? smsResult.data : []
      const emailRecords = Array.isArray(emailResult.data) ? emailResult.data : []
      const { conversations: convs, threadMessages: threads } = buildInboxData(smsRecords, emailRecords)
      setConversations(convs)
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
    if (!selectedConversation && displayedConversations.length > 0) {
      setSelectedConversation(displayedConversations[0].id)
    }
  }, [displayedConversations, selectedConversation])

  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

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

    // Send via existing scheduler endpoints
    try {
      if (effectiveChannel === 'SMS') {
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
    const convId = channel === 'SMS'
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

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId)
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv)))
    // Hide contact list on mobile when conversation is selected
    setShowContactList(false)
  }

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
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] gap-3 text-slate-500">
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
          />
        </div>

        {/* Right: Details */}
        {showDetails && selectedConvData && (
          <div className="hidden lg:flex flex-col w-80 min-h-0 h-full">
            <ContactDetails contact={selectedConvData.contact} onClose={() => setShowDetails(false)} />
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
