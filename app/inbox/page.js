'use client'

import { useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import ContactList from '@/app/inbox/components/ContactList'
import ConversationView from '@/app/inbox/components/ConversationView'
import ContactDetails from '@/app/inbox/components/ContactDetails'
import { conversations as initialConversations, messages as initialMessages } from '@/data/dummyData'
import { filterByBranch } from '@/lib/branch-filter'
import { cn } from '@/lib/utils'

export default function InboxPage() {
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [showContactList, setShowContactList] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [contactFilter, setContactFilter] = useState('All')
  const [conversations, setConversations] = useState(initialConversations)
  const [threadMessages, setThreadMessages] = useState(initialMessages)

  // Filter conversations by branch
  const filteredConversations = useMemo(
    () => filterByBranch(conversations),
    [conversations]
  )

  // Apply additional filters
  const normalizeContactType = (type) => {
    if (!type) return ''
    if (type.toLowerCase() === 'customer') return 'Customers'
    if (type.toLowerCase() === 'lead') return 'Leads'
    return type
  }

  const displayedConversations = filteredConversations.filter((conv) => {
    const matchesChannel = selectedChannel === 'All' || conv.channel === selectedChannel
    const matchesSearch = conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      contactFilter === 'All' || normalizeContactType(conv.contact.type) === contactFilter
    return matchesChannel && matchesSearch && matchesType
  })

  useEffect(() => {
    if (!selectedConversation && displayedConversations.length > 0) {
      setSelectedConversation(displayedConversations[0].id)
    }
  }, [displayedConversations, selectedConversation])

  const selectedConvData = selectedConversation
    ? displayedConversations.find((c) => c.id === selectedConversation)
    : null

  const conversationMessages = selectedConversation
    ? threadMessages[selectedConversation] || []
    : []

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
    setConversations((prev) =>
      prev.map((conv) => (conv.id === conversationId ? { ...conv, unread: 0 } : conv))
    )
    // Hide contact list on mobile when conversation is selected
    setShowContactList(false)
  }

  return (
    <MainLayout title="Inbox" subtitle="Manage all your conversations in one place">
      <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-10rem)]">
        {/* Contact List Panel - Hidden on mobile when conversation selected, always visible on tablet+ */}
        <div className={cn(
          "w-full md:w-auto",
          showContactList ? 'block' : 'hidden md:block'
        )}>
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

        {/* Conversation View Panel - Show on mobile when conversation selected, always visible on tablet+ */}
        <div className={cn(
          "w-full md:flex-1",
          !showContactList ? 'block' : 'hidden md:block'
        )}>
        <ConversationView
          conversation={selectedConvData}
          messages={conversationMessages}
          onToggleDetails={() => setShowDetails(!showDetails)}
          showDetails={showDetails}
          onSendMessage={handleSendMessage}
            onBackClick={() => setShowContactList(true)}
        />
        </div>

        {/* Contact Details Panel - Hidden on mobile, show as overlay or hidden */}
        {showDetails && selectedConvData && (
          <div className="hidden lg:block">
          <ContactDetails
            contact={selectedConvData.contact}
            onClose={() => setShowDetails(false)}
          />
          </div>
        )}
      </div>
    </MainLayout>
  )
}


