 'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ContactList from '@/app/inbox/components/ContactList'
import ConversationView from '@/app/inbox/components/ConversationView'
import ContactDetails from '@/app/inbox/components/ContactDetails'
import { conversations as initialConversations, messages as initialMessages } from '@/data/dummyData'
import { filterByBranch } from '@/lib/branch-filter'
import { useInboxHeader } from '@/contexts/InboxHeaderContext'
import { cn } from '@/lib/utils'

// Normalize contact type for filters (All, Customers, Leads, Teachers)
function normalizeContactType(type) {
  if (!type) return ''
  const t = type.toLowerCase()
  if (t === 'customer') return 'Customers'
  if (t === 'lead') return 'Leads'
  if (t === 'teacher') return 'Teachers'
  return type
}

export default function InboxPage() {
  const searchParams = useSearchParams()
  const { setInboxTeachersCount } = useInboxHeader()
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [showContactList, setShowContactList] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [contactFilter, setContactFilter] = useState('All')
  const [conversations, setConversations] = useState(initialConversations)
  const [threadMessages, setThreadMessages] = useState(initialMessages)

  // Sync URL ?filter= with contactFilter (header tabs use URL)
  const urlFilter = searchParams?.get('filter') || 'all'
  useEffect(() => {
    const map = { all: 'All', leads: 'Leads', teachers: 'Teachers' }
    setContactFilter(map[urlFilter] ?? 'All')
  }, [urlFilter])

  // Filter conversations by branch
  const filteredConversations = useMemo(() => filterByBranch(conversations), [conversations])

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

  const selectedConvData = selectedConversation ? displayedConversations.find((c) => c.id === selectedConversation) : null

  const conversationMessages = selectedConversation ? threadMessages[selectedConversation] || [] : []

  const handleSendMessage = ({ content, channel }) => {
    if (!selectedConversation || !content.trim()) return

    const newMessage = {
      id: `${Date.now()}`,
      sender: 'You',
      direction: 'outbound',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      channel,
    }

    setThreadMessages((prev) => ({
      ...prev,
      [selectedConversation]: [...(prev[selectedConversation] || []), newMessage],
    }))

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === selectedConversation
          ? {
              ...conv,
              lastMessage: content.trim(),
              timestamp: newMessage.timestamp,
              unread: 0,
              channel,
            }
          : conv
      )
    )
  }

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId)
    setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv)))
    // Hide contact list on mobile when conversation is selected
    setShowContactList(false)
  }

  return (
    <MainLayout title="Inbox" subtitle="Manage all your conversations in one place">
      <div className="flex flex-col lg:flex-row gap-0 h-[calc(100vh-8rem)]">
        {/* Left: Contact list */}
        <div className={cn( showContactList ? 'block' : 'hidden lg:block')}>
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
          />
        </div>

        {/* Middle: Conversation */}
        <div className={cn('w-full lg:flex-1', !showContactList ? 'block' : 'block')}>
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
          <div className="hidden lg:block w-80">
            <ContactDetails contact={selectedConvData.contact} onClose={() => setShowDetails(false)} />
          </div>
        )}
      </div>
    </MainLayout>
  )
}
