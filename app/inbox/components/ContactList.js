import { Search, Send, SlidersHorizontal, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials, formatDateTime, getContactDisplayName } from '@/lib/utils'

export default function ContactList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  contactFilter,
  onContactFilterChange,
  onNewConversation,
  onBatchSend,
}) {
  return (
    <aside
      className="hidden lg:flex flex-col min-h-0 bg-card h-full rounded-l-lg border-r border-border shadow-none"
      style={{ width: '330px' }}
    >
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Inbox</h3>
          <p className="text-xs text-muted-foreground">All conversations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 bg-muted border border-border rounded-lg flex items-center justify-center shadow-sm"
            title="Batch send"
            onClick={() => onBatchSend?.()}
          >
            <Users className="h-4 w-4 text-muted-foreground" />
          </button>
          {/* top action buttons (filter / sort) */}
          <button
            className="w-8 h-8 bg-muted border border-border rounded-lg flex items-center justify-center shadow-sm"
            title="Filter"
          >
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="relative">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--studio-primary)] text-white text-xs font-medium">
              {conversations.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search wrap */}
      <div className="px-3 pb-3">
        <div
          className="flex items-center gap-2 p-2 bg-background border border-border rounded-lg shadow-sm"
          style={{ height: 48 }}
        >
          <div className="flex items-center gap-2" style={{ width: 274 }}>
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-0 p-0 focus:ring-0 focus:border-0 text-sm bg-transparent text-foreground placeholder:text-muted-foreground"
              style={{ width: 220 }}
            />
          </div>

          {/* send icon to the right of search (as in Figma) */}
          <button
            className="ml-auto w-8 h-8 bg-muted border border-border rounded-lg flex items-center justify-center shadow-sm"
            title="New conversation"
            onClick={() => onNewConversation?.()}
          >
            <Send className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Conversation list */}
      <div className="overflow-y-auto flex-1 scrollbar-hide bg-card">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No conversations</div>
        ) : (
          conversations.map((conv) => {
            const isActive = selectedConversation === conv.id
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'flex flex-col px-3 py-2 cursor-pointer',
                  isActive ? 'bg-[color:var(--studio-primary-light)] dark:bg-primary/10' : 'hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* unread dot */}
                  <div className={cn('w-2.5 h-2.5 rounded-full', conv.unread ? 'bg-[color:var(--studio-primary)]' : 'bg-transparent')} />
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-[color:var(--studio-primary)] text-white font-semibold">
                      {getInitials(getContactDisplayName(conv.contact))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-medium truncate', isActive ? 'text-[color:var(--studio-primary)]' : 'text-foreground')}>
                        {getContactDisplayName(conv.contact)}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(conv.timestamp)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <p className={cn('text-sm truncate', isActive ? 'text-[color:var(--studio-primary)] font-medium' : 'text-muted-foreground')}>
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 ml-2">
                        {conv.unread > 0 && (
                          <span className="inline-flex items-center justify-center text-xs font-medium rounded-full bg-[color:var(--studio-primary)] text-white w-5 h-5">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 border-t border-border" />
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
