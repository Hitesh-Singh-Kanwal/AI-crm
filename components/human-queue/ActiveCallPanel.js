'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRightLeft,
  CheckCircle2,
  Mic,
  MicOff,
  Minimize2,
  Maximize2,
  Pause,
  Phone,
  PhoneOff,
  Play,
  User,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import {
  disconnectConnection,
  isConnectionMuted,
  muteConnection,
  subscribeToConnectionEvents,
} from '@/lib/twilioVoiceClient'
import { useCallTimer } from './useCallTimer'

function CallActionButton({ icon: Icon, label, active, danger, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-3 transition-all disabled:opacity-50',
        danger
          ? 'bg-red-500 text-white hover:bg-red-600'
          : active
            ? 'bg-[var(--studio-primary)] text-white shadow-md'
            : 'bg-muted/80 text-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </button>
  )
}

export default function ActiveCallPanel({
  call,
  connection,
  agents = [],
  onEndCall,
  onResolve,
  onTransfer,
  onHoldChange,
  onClose,
  resolving = false,
  transferring = false,
  callStatus = 'connecting',
}) {
  const [minimized, setMinimized] = useState(false)
  const [muted, setMuted] = useState(false)
  const [callerOnHold, setCallerOnHold] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [notes, setNotes] = useState('')

  const isConnected = callStatus === 'connected' || callStatus === 'on_hold'
  const { formatted: callDuration } = useCallTimer(isConnected, call?.inProgressAt || call?.claimedAt)

  const transferCandidates = useMemo(() => {
    const currentId = String(call?.assignedUserId || call?.assignedAgentId || '')
    return agents.filter((agent) => agent.id !== currentId && agent.availability === 'available')
  }, [agents, call])

  useEffect(() => {
    if (!connection) return undefined

    setMuted(isConnectionMuted(connection))

    return subscribeToConnectionEvents(connection, {
      mute: (isMuted) => setMuted(isMuted),
      disconnect: () => onClose?.(),
    })
  }, [connection, onClose])

  const handleToggleMute = () => {
    const next = !muted
    muteConnection(connection, next)
    setMuted(next)
  }

  const handleToggleHold = async () => {
    const next = !callerOnHold
    try {
      await onHoldChange?.(next)
      setCallerOnHold(next)
    } catch {
      // parent shows toast
    }
  }

  const handleTransfer = async () => {
    if (!selectedAgentId) return
    await onTransfer?.(selectedAgentId)
    setShowTransfer(false)
    setSelectedAgentId('')
  }

  const handleHangUp = () => {
    disconnectConnection(connection)
    onEndCall?.()
  }

  const callerName = call?.leadName || call?.callerName || 'Unknown caller'
  const callerPhone = call?.phone || call?.callerPhone || 'Unknown number'

  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[60]">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex items-center gap-3 rounded-2xl border border-[var(--studio-primary)]/30 bg-card px-4 py-3 shadow-2xl"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">{callerName}</p>
            <p className="text-xs text-muted-foreground">{callDuration} · {callerOnHold ? 'On hold' : 'Live'}</p>
          </div>
          <Maximize2 className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={isConnected ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-scale-in">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/70">
                <span className="relative flex h-2 w-2">
                  {isConnected && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2 w-2 rounded-full',
                      callStatus === 'connecting'
                        ? 'bg-amber-400'
                        : callerOnHold
                          ? 'bg-amber-400'
                          : 'bg-emerald-400',
                    )}
                  />
                </span>
                {callStatus === 'connecting' ? 'Connecting…' : callerOnHold ? 'Caller on hold' : 'Live call'}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums">{callDuration}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={isConnected ? () => setMinimized(true) : onClose}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                title={isConnected ? 'Minimize' : 'Close'}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-14 w-14 border-2 border-white/20">
              <AvatarFallback className="bg-white/10 text-lg font-semibold text-white">
                {getInitials(callerName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{callerName}</p>
              <p className="text-sm text-white/70">{callerPhone}</p>
              <p className="mt-0.5 text-xs text-white/50">
                Escalated {formatDateTime(call?.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {(call?.escalationReason || call?.lastMessage || call?.aiSummary) && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reason for call</p>
              <p className="mt-1 text-sm text-foreground">
                &quot;{call?.lastMessage || call?.escalationReason}&quot;
              </p>
              {call?.aiSummary && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium">AI summary:</span> {call.aiSummary}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <CallActionButton
              icon={muted ? MicOff : Mic}
              label={muted ? 'Unmute' : 'Mute'}
              active={muted}
              disabled={!isConnected}
              onClick={handleToggleMute}
            />
            <CallActionButton
              icon={callerOnHold ? Play : Pause}
              label={callerOnHold ? 'Resume' : 'Hold'}
              active={callerOnHold}
              disabled={!isConnected}
              onClick={handleToggleHold}
            />
            <CallActionButton
              icon={ArrowRightLeft}
              label="Transfer"
              disabled={!isConnected || transferCandidates.length === 0}
              onClick={() => setShowTransfer(true)}
            />
            <CallActionButton
              icon={PhoneOff}
              label="Hang up"
              danger
              onClick={handleHangUp}
            />
          </div>

          {showTransfer && (
            <div className="rounded-xl border border-border bg-background p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Transfer to agent</p>
                <button
                  type="button"
                  onClick={() => setShowTransfer(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
              >
                <option value="">Select available agent</option>
                {transferCandidates.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.activeChats}/{agent.maxConcurrent} active)
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedAgentId || transferring}
                onClick={handleTransfer}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--studio-primary)] text-sm font-medium text-white hover:brightness-95 disabled:opacity-60"
              >
                <User className="h-4 w-4" />
                {transferring ? 'Transferring…' : 'Confirm transfer'}
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Call notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add notes while on the call…"
              rows={2}
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--studio-primary)]/30"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={resolving}
              onClick={() => onResolve?.()}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {resolving ? 'Resolving…' : 'Resolve & close'}
            </button>
            <button
              type="button"
              onClick={handleHangUp}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
              Leave call
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
