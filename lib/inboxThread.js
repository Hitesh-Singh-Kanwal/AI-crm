import { dedupeThreadMessages } from '@/lib/emailSend'

export function last10Digits(value) {
  return String(value || '').replace(/\D/g, '').slice(-10)
}

export function mergeThreadByTimestamp(smsMessages = [], emailMessages = [], callMessages = []) {
  return dedupeThreadMessages(
    [...smsMessages, ...emailMessages, ...callMessages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    ),
  )
}

export function mergeSmsPages(incoming = [], existing = []) {
  return dedupeThreadMessages([...incoming, ...existing])
}

export function mapSmsHistoryMessages(messages = [], contactName = 'Lead') {
  return messages.map((m) => ({
    id: String(m._id),
    sender: m.status === 'received' ? contactName : 'You',
    direction: m.status === 'received' ? 'inbound' : 'outbound',
    content: m.message,
    timestamp: m.createdAt,
    channel: 'SMS',
  }))
}

export function mapHumanCallToMessage(call) {
  const status = call.status || 'initiated'
  const when = call.initiatedAt || call.createdAt
  const durationSec = call.duration ?? call.recordingDuration
  const durationLabel =
    durationSec != null && durationSec !== ''
      ? ` · ${Math.max(0, Number(durationSec))}s`
      : ''
  const fromLabel = call.fromNumber ? ` from ${call.fromNumber}` : ''
  return {
    id: `human-call-${call._id || call.twilioSid || when}`,
    callRecordId: call._id ? String(call._id) : null,
    sender: 'You',
    direction: 'outbound',
    content: `Outbound call${fromLabel} · ${status}${durationLabel}${
      call.errorMessage ? ` — ${call.errorMessage}` : ''
    }`,
    timestamp: when || new Date().toISOString(),
    channel: 'Call',
    callKind: 'human',
    status,
    phoneNumber: call.phoneNumber || '',
    fromNumber: call.fromNumber || '',
    hasRecording: Boolean(call.recordingUrl || call.recordingSid),
    recordingUrl: call.recordingUrl || '',
    duration: durationSec != null ? Number(durationSec) : null,
  }
}

export function mapAiCallToMessage(call) {
  const status = call.status || 'unknown'
  const summary =
    call.analysis?.summary ||
    call.summary ||
    call.endedReason ||
    (call.assistantName ? `AI assistant: ${call.assistantName}` : 'AI call')
  return {
    id: `ai-call-${call._id || call.callId}`,
    sender: call.assistantName || 'AI',
    direction: 'outbound',
    content: summary,
    timestamp: call.startedAt || call.endedAt || call.createdAt || new Date().toISOString(),
    channel: 'Call',
    callKind: 'ai',
    status,
    phoneNumber: call.customer?.number || call.phoneNumber || '',
    assistantName: call.assistantName || '',
    callDetailId: call._id || null,
    recordingUrl:
      call.recordingUrl ||
      call.artifact?.recordingUrl ||
      call.stereoRecordingUrl ||
      call.artifact?.stereoRecordingUrl ||
      '',
    endedReason: call.endedReason || '',
  }
}
