import { useState, useEffect, useRef, useCallback } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDateTime } from '@/lib/utils'
import MessageInput from './MessageInput'
import ConversationChannelTabs from './ConversationChannelTabs'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export default function ConversationView({
  conversation,
  messages,
  onToggleDetails,
  onSendMessage,
  onBackClick,
  onLoadMore,
  hasMore,
  loadingMore,
}) {
  const [activeTab, setActiveTab] = useState('All')
  const scrollRef = useRef(null)
  const prevScrollHeightRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  // Reset on conversation change and scroll to bottom
  useEffect(() => {
    setActiveTab('All')
    prevScrollHeightRef.current = 0
    isLoadingMoreRef.current = false
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation?.id])

  // After messages update: scroll to bottom on initial load, restore position on load-more
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (isLoadingMoreRef.current) {
      const diff = el.scrollHeight - prevScrollHeightRef.current
      if (diff > 0) el.scrollTop = diff
      isLoadingMoreRef.current = false
    } else {
      el.scrollTop = el.scrollHeight
    }
    prevScrollHeightRef.current = el.scrollHeight
  }, [messages])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasMore || loadingMore) return
    if (el.scrollTop < 50) {
      isLoadingMoreRef.current = true
      prevScrollHeightRef.current = el.scrollHeight
      onLoadMore?.()
    }
  }, [hasMore, loadingMore, onLoadMore])
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card rounded-2xl border border-border shadow-md">
        <div className="text-center">
          <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-2">No Conversation Selected</h3>
          <p className="text-sm text-muted-foreground">Select a conversation from the left to view messages</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-card h-full border-l border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBackClick && (
              <Button variant="ghost" size="icon" onClick={onBackClick} className="lg:hidden h-9 w-9">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[color:var(--studio-primary)] text-white font-semibold text-sm">
                  {getInitials(conversation.contact.name)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full ring-2 ring-card bg-emerald-500 dark:bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{conversation.contact.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{conversation.contact.type}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleDetails}
              className="px-3 py-1 rounded-md text-sm bg-[color:var(--studio-primary)] text-white"
            >
              View profile
            </button>
          </div>
        </div>

        {/* Channel tabs */}
        <ConversationChannelTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-hide py-3 px-4 bg-muted/40">
        {loadingMore && (
          <div className="text-center text-xs text-muted-foreground py-2">Loading older messages…</div>
        )}
        {(() => {
          const tabChannelMap = { 'E-mail': 'Email', 'SMS': 'SMS', 'Call': 'Call' }
          const filtered = activeTab === 'All' ? messages : messages.filter((m) => m.channel === tabChannelMap[activeTab])
          if (filtered.length === 0) return (
            <div className="text-center text-muted-foreground text-sm py-8">
              {messages.length === 0 ? 'No messages yet. Start the conversation!' : `No ${activeTab} messages.`}
            </div>
          )
          return filtered.map((message, idx) => {
            const isInbound = message.direction === 'inbound'
            const prev = messages[idx - 1]
            const showDateDivider = !prev || new Date(prev.timestamp).toDateString() !== new Date(message.timestamp).toDateString()
            return (
              <div key={message.id}>
                {showDateDivider && (
                  <div className="flex items-center my-2">
                    <div className="flex-1 h-px bg-border" />
                    <div className="px-3 text-xs text-muted-foreground">{new Date(message.timestamp).toLocaleDateString()}</div>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div className={cn('flex items-start gap-3 mb-3', isInbound ? 'justify-start' : 'justify-end')}>
                  {isInbound && (
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                          {getInitials(message.sender)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  <div className={cn('max-w-[70%]')}>
                    <div
                      className={cn(
                        'px-4 py-3 rounded-xl break-words shadow-sm',
                        isInbound ? 'bg-card border border-border text-foreground' : 'bg-[color:var(--studio-primary)] text-white'
                      )}
                    >
                      <div
                        className={cn(
                          'text-sm leading-relaxed',
                          // Give markdown elements consistent spacing + wrapping
                          '[&_*]:break-words [&_p]:whitespace-pre-wrap [&_p]:m-0 [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:mt-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mt-1',
                          isInbound ? '[&_a]:text-[color:var(--studio-primary)]' : '[&_a]:text-white [&_a]:underline'
                        )}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          skipHtml
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noreferrer noopener" />
                            ),
                          }}
                        >
                          {String(message.content || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{formatDateTime(message.timestamp)}</div>
                  </div>
                  {!isInbound && (
                    <div className="ml-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[color:var(--studio-primary)] text-white text-xs font-semibold">
                          {getInitials(message.sender)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* Message Input - no separating line, white input box */}
      <div className="pt-1 pb-1 px-2 bg-muted/40 border-t border-border">
        {activeTab === 'Call' ? (
          <p className="text-sm text-muted-foreground text-center py-4">Calls cannot be sent from the inbox.</p>
        ) : (
          <MessageInput
            onSendMessage={onSendMessage}
            channel={activeTab === 'All' ? conversation.channel : activeTab === 'E-mail' ? 'Email' : activeTab}
          />
        )}
      </div>
    </main>
  )
}
