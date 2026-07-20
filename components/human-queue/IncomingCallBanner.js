'use client'

import { PhoneCall, PhoneIncoming } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function IncomingCallBanner({
  waitingCalls = [],
  onAnswerNext,
  answeringId,
  isOnCall,
  canAnswer = true,
}) {
  if (waitingCalls.length === 0) return null

  const nextCall = waitingCalls[0]
  const nextId = nextCall?.id || nextCall?._id
  const highPriorityCount = waitingCalls.filter((call) => call.priority === 'High').length

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border px-4 py-3 shadow-sm',
        highPriorityCount > 0
          ? 'border-red-300/70 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
          : 'border-[var(--studio-primary)]/40 bg-[var(--studio-primary-light)]/40',
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 animate-pulse bg-[var(--studio-primary)]" />
      <div className="flex flex-wrap items-center justify-between gap-3 pl-2">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
              highPriorityCount > 0
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-[var(--studio-primary)] text-white',
            )}
          >
            <PhoneIncoming className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {waitingCalls.length} incoming call{waitingCalls.length === 1 ? '' : 's'} waiting
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Next: {nextCall?.leadName || nextCall?.callerName || 'Unknown caller'}
              {nextCall?.waitMinutes ? ` · waiting ${nextCall.waitMinutes}m` : ''}
              {highPriorityCount > 0 ? ` · ${highPriorityCount} high priority` : ''}
            </p>
          </div>
        </div>

        {!isOnCall && canAnswer && (
          <button
            type="button"
            disabled={answeringId === nextId}
            onClick={() => onAnswerNext?.(nextCall)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            <PhoneCall className="h-4 w-4" />
            {answeringId === nextId ? 'Connecting…' : 'Answer Next'}
          </button>
        )}
      </div>
    </div>
  )
}
