'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDateTime, getContactDisplayName } from '@/lib/utils'
import MessageInput from './MessageInput'
import EmailMessageInput from './EmailMessageInput'
import CallMessageInput from './CallMessageInput'
import CallLogList from './CallLogList'
import ConversationChannelTabs from './ConversationChannelTabs'
import { ScaledInboxHtmlEmail, shouldRenderEmailAsRichHtml } from './InboxHtmlEmailFrame'
import { htmlToPlainText, emailBodyToPlainText } from '@/lib/emailSend'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

const TAB_CHANNEL_MAP = { 'E-mail': 'Email', SMS: 'SMS', Call: 'Call' }

function defaultChannelTab(conversation) {
  if (!conversation) return 'SMS'
  if (conversation.channel === 'Email') return 'E-mail'
  if (conversation.channel === 'Call') return 'Call'
  return 'SMS'
}

export default function ConversationView({
  conversation,
  messages,
  onToggleDetails,
  onSendMessage,
  onBackClick,
  onLoadMore,
  hasMore,
  loadingMore,
  leadData = null,
  emailSending = false,
  smsSending = false,
  onEmailTabActive,
  onCallTabActive,
  onPlaceCall,
  callPlacing = false,
  callLogsLoading = false,
}) {
  const [activeTab, setActiveTab] = useState(() => defaultChannelTab(conversation))
  const scrollRef = useRef(null)
  const prevScrollHeightRef = useRef(0)
  const isLoadingMoreRef = useRef(false)

  const leadPreview = leadData || conversation?.contact || null
  const contactEmail = leadPreview?.email || conversation?.contact?.email || ''
  const contactPhone = leadPreview?.phoneNumber || conversation?.contact?.phoneNumber || ''
  const contactName = getContactDisplayName(leadPreview || conversation?.contact || {})

  useEffect(() => {
    setActiveTab(defaultChannelTab(conversation))
    prevScrollHeightRef.current = 0
    isLoadingMoreRef.current = false
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation?.id])

  useEffect(() => {
    if (activeTab === 'E-mail') onEmailTabActive?.()
    if (activeTab === 'Call') onCallTabActive?.()
    // Only re-run when the tab or conversation changes — not when parent re-creates callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, conversation?.id])

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
  }, [messages, activeTab])

  const handleScroll = useCallback(() => {
    if (activeTab === 'Call') return
    const el = scrollRef.current
    if (!el || !hasMore || loadingMore) return
    if (el.scrollTop < 50) {
      isLoadingMoreRef.current = true
      prevScrollHeightRef.current = el.scrollHeight
      onLoadMore?.()
    }
  }, [hasMore, loadingMore, onLoadMore, activeTab])

  const handleLoadOlder = useCallback(() => {
    if (activeTab === 'Call') return
    if (!hasMore || loadingMore) return
    const el = scrollRef.current
    if (el) {
      isLoadingMoreRef.current = true
      prevScrollHeightRef.current = el.scrollHeight
    }
    onLoadMore?.()
  }, [hasMore, loadingMore, onLoadMore, activeTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  const callMessages = (messages || [])
    .filter((m) => m.channel === 'Call')
    .slice()
    // Oldest → newest so the latest call/recording is at the bottom (chat-style).
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  useEffect(() => {
    if (activeTab !== 'Call') return
    const el = scrollRef.current
    if (!el) return
    // After call history loads / updates, keep the latest entry in view.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [activeTab, callMessages.length, callLogsLoading])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card rounded-none lg:rounded-2xl border-0 lg:border border-border shadow-none lg:shadow-md">
        <div className="text-center px-6">
          <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base font-semibold text-foreground mb-2">No Conversation Selected</h3>
          <p className="text-sm text-muted-foreground">Select a conversation from the left to view messages</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-card h-full border-l-0 lg:border-l border-border overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onBackClick && (
              <Button variant="ghost" size="icon" onClick={onBackClick} className="lg:hidden h-9 w-9 shrink-0">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-[color:var(--studio-primary)] text-white font-semibold text-sm">
                  {getInitials(getContactDisplayName(conversation.contact))}
                </AvatarFallback>
              </Avatar>
              <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full ring-2 ring-card bg-emerald-500 dark:bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{getContactDisplayName(conversation.contact)}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{conversation.contact.type}</span>
                {contactPhone && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground truncate">{contactPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab !== 'Call' && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleLoadOlder}
                disabled={!hasMore || loadingMore}
                title={
                  loadingMore
                    ? 'Loading older messages…'
                    : hasMore
                      ? 'Load older messages'
                      : 'No older messages'
                }
                className="h-9 w-9"
              >
                <RefreshCw
                  className={cn(
                    'h-4 w-4 text-muted-foreground',
                    loadingMore && 'animate-spin'
                  )}
                />
                <span className="sr-only">Load older messages</span>
              </Button>
            )}
            <button
              onClick={onToggleDetails}
              className="px-2.5 sm:px-3 py-1 rounded-md text-xs sm:text-sm whitespace-nowrap bg-[color:var(--studio-primary)] text-white"
            >
              View profile
            </button>
          </div>
        </div>

        <ConversationChannelTabs activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Messages / call logs */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden scrollbar-hide py-3 px-3 sm:px-4 bg-muted/40">
        {activeTab === 'Call' ? (
          callLogsLoading && callMessages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">Loading call logs…</div>
          ) : (
            <CallLogList calls={callMessages} contactName={contactName} />
          )
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={handleLoadOlder}
                  disabled={loadingMore}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors',
                    'hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-60'
                  )}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loadingMore && 'animate-spin')} />
                  {loadingMore ? 'Loading older messages…' : 'Load older messages'}
                </button>
              </div>
            )}
            {(() => {
              const filtered = messages.filter((m) => m.channel === TAB_CHANNEL_MAP[activeTab])
              if (filtered.length === 0) return (
                <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                  {activeTab === 'E-mail' ? (
                    <>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No emails yet</p>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        Write a message below or choose a template to send a designed email.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {messages.length === 0 ? 'No messages yet. Start the conversation!' : `No ${activeTab} messages.`}
                    </p>
                  )}
                </div>
              )
              return filtered.map((message, idx) => {
                const isInbound = message.direction === 'inbound'
                const prev = filtered[idx - 1]
                const showDateDivider = !prev || new Date(prev.timestamp).toDateString() !== new Date(message.timestamp).toDateString()
                return (
                  <div key={`${message.channel || 'msg'}-${message.id}-${idx}`}>
                    {showDateDivider && (
                      <div className="flex items-center my-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="mx-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {new Date(message.timestamp).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className={cn('flex mb-3', isInbound ? 'justify-start' : 'justify-end')}>
                      {isInbound && (
                        <div className="mr-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                              {getInitials(message.sender || contactName)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex min-w-0 max-w-[min(100%,28rem)] flex-col sm:max-w-[min(100%,32rem)]',
                          isInbound ? 'items-start' : 'items-end',
                        )}
                      >
                        {message.channel === 'Email' ? (
                          <div
                            className={cn(
                              'w-full min-w-0 max-w-full overflow-hidden rounded-2xl border shadow-sm',
                              isInbound
                                ? 'border-border bg-card rounded-tl-md'
                                : 'border-[color:var(--studio-primary)]/25 bg-[color:var(--studio-primary-light)]/35 rounded-tr-md',
                            )}
                          >
                            <div
                              className={cn(
                                'flex items-start gap-2.5 border-b px-3.5 py-2.5',
                                isInbound
                                  ? 'border-border bg-muted/50'
                                  : 'border-[color:var(--studio-primary)]/15 bg-[color:var(--studio-primary-light)]/70',
                              )}
                            >
                              <div
                                className={cn(
                                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                                  isInbound
                                    ? 'bg-background text-muted-foreground border border-border'
                                    : 'bg-[color:var(--studio-primary)] text-white',
                                )}
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {isInbound ? 'Received' : 'Sent'}
                                  </p>
                                  {message.status &&
                                  !['sent', 'received', 'inbound', 'outbound', 'processed'].includes(
                                    String(message.status).toLowerCase(),
                                  ) ? (
                                    <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                                      {message.status}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="truncate text-xs font-medium text-muted-foreground leading-snug">
                                  {isInbound
                                    ? message.sender || contactName || 'Contact'
                                    : 'You'}
                                </p>
                                <p className="truncate text-sm font-semibold text-foreground leading-snug">
                                  {message.subject?.trim() || '(No subject)'}
                                </p>
                              </div>
                            </div>

                            {shouldRenderEmailAsRichHtml(message.contentHtml) ? (
                              <div className="min-w-0 w-full overflow-hidden bg-card">
                                <ScaledInboxHtmlEmail
                                  html={message.contentHtml}
                                  title={message.subject || 'Email message'}
                                  minHeight={120}
                                  maxHeight={380}
                                />
                              </div>
                            ) : (
                              <div className="bg-card px-4 py-3.5 sm:px-5 sm:py-4">
                                <div className="rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3 text-[14px] leading-relaxed text-foreground">
                                  <div className="prose prose-sm max-w-none prose-p:my-0 prose-p:leading-relaxed prose-a:text-[color:var(--studio-primary)]">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm, remarkBreaks]}
                                      components={{
                                        a: ({ node, ...props }) => (
                                          <a {...props} target="_blank" rel="noreferrer noopener" />
                                        ),
                                      }}
                                    >
                                      {String(
                                        emailBodyToPlainText(message.contentHtml) ||
                                          message.content ||
                                          htmlToPlainText(message.contentHtml) ||
                                          '',
                                      )}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                              isInbound
                                ? 'bg-card border border-border text-foreground rounded-tl-md'
                                : 'bg-[color:var(--studio-primary)] text-white rounded-tr-md',
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        )}
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
          </>
        )}
      </div>

      {/* Composer */}
      <div className="flex-shrink-0">
        {activeTab === 'Call' ? (
          <CallMessageInput
            phoneNumber={contactPhone}
            contactName={contactName}
            onPlaceCall={onPlaceCall}
            calling={callPlacing}
            disabled={!contactPhone}
            disabledReason={
              !contactPhone
                ? 'Add a phone number on this contact to place a call.'
                : ''
            }
          />
        ) : activeTab === 'E-mail' ? (
          contactEmail ? (
            <EmailMessageInput
              onSendMessage={onSendMessage}
              sending={emailSending}
            />
          ) : (
            <div className="border-t border-border bg-card px-4 py-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <Mail className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-foreground">No email on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add an email address on this contact to send messages.
              </p>
            </div>
          )
        ) : (
          <MessageInput onSendMessage={onSendMessage} channel="SMS" sending={smsSending} />
        )}
      </div>
    </main>
  )
}
