import { useState, useMemo, useEffect } from 'react'
import { Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDateTime } from '@/lib/utils'
import MessageInput from './MessageInput'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export default function ConversationView({
  conversation,
  messages,
  onToggleDetails,
  showDetails,
  onSendMessage,
  onBackClick,
}) {
  const [activeTab, setActiveTab] = useState('All')

  useEffect(() => {
    setActiveTab('All')
  }, [conversation?.id])
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-md">
        <div className="text-center">
          <Mail className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-base font-semibold text-slate-900 mb-2">No Conversation Selected</h3>
          <p className="text-sm text-slate-500">Select a conversation from the left to view messages</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-white h-full border-l border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBackClick && (
              <Button variant="ghost" size="icon" onClick={onBackClick} className="lg:hidden h-9 w-9">
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </Button>
            )}
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[color:var(--studio-primary)] text-white font-semibold text-sm">
                  {getInitials(conversation.contact.name)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-[#00AA34]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">{conversation.contact.name}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748B]">{conversation.contact.type}</span>
                <span className="text-xs text-[#94A3B8]">•</span>
                <span className="text-xs text-[#94A3B8]">Today</span>
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
        <div className="mt-3 flex items-center gap-2 text-xs">
          {['All', 'E-mail', 'SMS', 'Call'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1 rounded-md text-sm transition-colors',
                activeTab === tab
                  ? 'bg-[color:var(--studio-primary-light)] text-[color:var(--studio-primary)]'
                  : 'text-[#64748B] hover:bg-slate-100'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-4 bg-slate-50">
        {(() => {
          const tabChannelMap = { 'E-mail': 'Email', 'SMS': 'SMS', 'Call': 'Call' }
          const filtered = activeTab === 'All' ? messages : messages.filter((m) => m.channel === tabChannelMap[activeTab])
          if (filtered.length === 0) return (
            <div className="text-center text-slate-500 text-sm py-8">
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
                    <div className="flex-1 h-px bg-[#E6EEF8]" />
                    <div className="px-3 text-xs text-[#64748B]">{new Date(message.timestamp).toLocaleDateString()}</div>
                    <div className="flex-1 h-px bg-[#E6EEF8]" />
                  </div>
                )}

                <div className={cn('flex items-start gap-3 mb-3', isInbound ? 'justify-start' : 'justify-end')}>
                  {isInbound && (
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-semibold">
                          {getInitials(message.sender)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  <div className={cn('max-w-[70%]')}>
                    <div
                      className={cn(
                        'px-4 py-3 rounded-xl break-words shadow-sm',
                        isInbound ? 'bg-white border border-[#EDF2F7] text-slate-900' : 'bg-[color:var(--studio-primary)] text-white'
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
                    <div className="mt-2 text-xs text-[#94A3B8]">{formatDateTime(message.timestamp)}</div>
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
      <div className="pt-1 pb-1 px-2 bg-slate-50">
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