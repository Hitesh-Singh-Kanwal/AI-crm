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

function forwardedStatusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'forward_answered') return 'answered'
  if (s === 'forward_voicemail') return 'voicemail'
  if (s === 'forward_missed' || s === 'forwarding') return 'missed'
  if (s === 'failed') return 'failed'
  return s || 'unknown'
}

function forwardedContent(call) {
  const status = String(call.status || '').toLowerCase()
  const durationSec = call.durationSeconds
  const durationLabel =
    durationSec != null && durationSec !== ''
      ? ` · ${Math.max(0, Number(durationSec))}s`
      : ''
  if (status === 'forward_answered') {
    return `Forwarded to studio phone · answered${durationLabel}`
  }
  if (status === 'forward_voicemail') {
    return `Forwarded to studio phone · no one answered · voicemail left`
  }
  if (status === 'failed') {
    return 'Could not reach the studio phone.'
  }
  return `Forwarded to studio phone · no one answered${durationLabel}`
}

/** InboundCallSession rows from customer-call forwarding. */
export function mapForwardedCallToMessage(call) {
  const when = call.createdAt || call.updatedAt
  const durationSec = call.durationSeconds
  return {
    id: `forwarded-call-${call._id || when}`,
    callRecordId: call._id ? String(call._id) : null,
    sender: call.callerName || call.callerPhone || 'Caller',
    direction: 'inbound',
    content: forwardedContent(call),
    timestamp: when || new Date().toISOString(),
    channel: 'Call',
    callKind: 'forwarded',
    status: forwardedStatusLabel(call.status),
    phoneNumber: Array.isArray(call.forwardedTo) ? call.forwardedTo.join(', ') : '',
    fromNumber: call.callerPhone || '',
    hasRecording: Boolean(call.recordingUrl || call.recordingSid),
    recordingUrl: call.recordingUrl || '',
    recordingKind: call.recordingKind || null,
    duration: durationSec != null ? Number(durationSec) : null,
  }
}
