import { cn } from '@/lib/utils'

const CHANNEL_TABS = ['E-mail', 'SMS', 'Call']

export default function ConversationChannelTabs({ activeTab, onTabChange }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-xs">
      {CHANNEL_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            'px-3 py-1 rounded-md text-sm transition-colors',
            activeTab === tab
              ? 'bg-[color:var(--studio-primary-light)] dark:bg-primary/15 text-[color:var(--studio-primary)]'
              : 'text-muted-foreground hover:bg-muted'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
