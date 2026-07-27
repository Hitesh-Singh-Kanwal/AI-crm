import { Search, Send, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials, formatDateTime, getContactDisplayName } from '@/lib/utils'

const FILTER_LABEL = {
  Customers: 'customer',
  Leads: 'lead',
  Teachers: 'teacher',
}

export default function ContactList({
  conversations,
  selectedConversation,
  onSelectConversation,
  searchQuery,
  onSearchChange,
  contactFilter,
  onNewConversation,
  onBatchSend,
}) {
  const singular = FILTER_LABEL[contactFilter] || 'contact'
  const plural =
    contactFilter === 'Customers'
      ? 'customers'
      : contactFilter === 'Leads'
        ? 'leads'
        : contactFilter === 'Teachers'
          ? 'teachers'
          : 'contacts'

  return (
    <aside
      className="flex flex-col min-h-0 bg-card h-full w-full lg:w-[330px] lg:shrink-0 rounded-none lg:rounded-l-lg border-r border-border shadow-none"
    >
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">Inbox</h3>
          <p className="text-xs text-muted-foreground truncate capitalize">{plural}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-muted border border-border text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
            title={`Bulk message ${plural}`}
            onClick={() => onBatchSend?.()}
          >
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Bulk</span>
          </button>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-[color:var(--studio-primary)] text-white text-xs font-medium">
            {conversations.length}
          </span>
        </div>
      </div>

      {/* Search + new message */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 p-2 h-12 bg-background border border-border rounded-lg shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder={`Search ${plural}…`}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-0 p-0 focus:ring-0 focus:border-0 text-sm bg-transparent text-foreground placeholder:text-muted-foreground w-full min-w-0"
            />
          </div>

          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-2.5 shrink-0 rounded-lg bg-[color:var(--studio-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
            title={`Message a ${singular}`}
            onClick={() => onNewConversation?.()}
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground px-0.5">
          Messaging {plural} only
        </p>
      </div>

      <div className="border-t border-border" />

      {/* Conversation list */}
      <div className="overflow-y-auto flex-1 scrollbar-hide bg-card">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No {plural} conversations yet.
          </div>
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
                  <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', conv.unread ? 'bg-[color:var(--studio-primary)]' : 'bg-transparent')} />
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
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDateTime(conv.timestamp)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className={cn('text-sm truncate', isActive ? 'text-[color:var(--studio-primary)] font-medium' : 'text-muted-foreground')}>
                        {conv.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
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
