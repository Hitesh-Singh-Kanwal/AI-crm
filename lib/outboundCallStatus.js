const TERMINAL_OUTBOUND_STATUSES = new Set([
  'completed',
  'busy',
  'no-answer',
  'canceled',
  'failed',
])

export function isPersistedCallId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ''))
}

/** Map a Twilio call record status onto the callback call panel. */
export function nextOutboundPanelStatus(remoteStatus, localStatus) {
  const status = String(remoteStatus || '').toLowerCase()
  if (TERMINAL_OUTBOUND_STATUSES.has(status)) return 'ended'
  if (localStatus === 'on_hold') return 'on_hold'
  if (status === 'in-progress' || localStatus === 'connected') return 'connected'
  return 'connecting'
}
