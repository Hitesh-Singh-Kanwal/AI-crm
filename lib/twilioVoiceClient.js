'use client'

let devicePromise = null
let activeDevice = null
let activeConnection = null

async function loadVoiceSdk() {
  const mod = await import('@twilio/voice-sdk')
  return mod.Device
}

export function getActiveConnection() {
  return activeConnection
}

export function getActiveDevice() {
  return activeDevice
}

export async function ensureTwilioDevice(fetchToken) {
  if (activeDevice && activeDevice.state === 'registered') {
    return activeDevice
  }

  if (!devicePromise) {
    devicePromise = (async () => {
      const tokenResult = await fetchToken()
      const payload = tokenResult?.data || tokenResult
      const token = payload?.token
      if (!token) {
        throw new Error(tokenResult?.error || tokenResult?.message || 'Voice token unavailable')
      }

      const Device = await loadVoiceSdk()
      const device = new Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        closeProtection: true,
      })

      await device.register()
      activeDevice = device
      return device
    })()
  }

  try {
    return await devicePromise
  } catch (error) {
    devicePromise = null
    activeDevice = null
    throw error
  }
}

function bindConnectionEvents(connection) {
  connection.on('disconnect', () => {
    if (activeConnection === connection) {
      activeConnection = null
    }
  })
  connection.on('cancel', () => {
    if (activeConnection === connection) {
      activeConnection = null
    }
  })
  connection.on('error', () => {
    if (activeConnection === connection) {
      activeConnection = null
    }
  })
}

export async function joinConferenceCall({ fetchToken, conferenceName, queueItemId }) {
  const device = await ensureTwilioDevice(fetchToken)
  const connection = await device.connect({
    params: {
      conferenceName: String(conferenceName),
      queueItemId: String(queueItemId),
    },
  })
  activeConnection = connection
  bindConnectionEvents(connection)
  return connection
}

export function muteConnection(connection, muted = true) {
  const target = connection || activeConnection
  if (!target?.mute) return false
  target.mute(Boolean(muted))
  return target.isMuted?.() ?? Boolean(muted)
}

export function isConnectionMuted(connection) {
  const target = connection || activeConnection
  return target?.isMuted?.() ?? false
}

export function disconnectConnection(connection) {
  const target = connection || activeConnection
  target?.disconnect?.()
  if (activeConnection === target) {
    activeConnection = null
  }
}

export function disconnectAllCalls() {
  activeDevice?.disconnectAll()
  activeConnection = null
}

export function destroyTwilioDevice() {
  disconnectAllCalls()
  activeDevice?.destroy()
  activeDevice = null
  devicePromise = null
}

export function subscribeToConnectionEvents(connection, handlers = {}) {
  const target = connection || activeConnection
  if (!target?.on) return () => {}

  const events = ['accept', 'disconnect', 'cancel', 'error', 'mute', 'reconnecting', 'reconnected']
  events.forEach((event) => {
    if (handlers[event]) {
      target.on(event, handlers[event])
    }
  })

  return () => {
    events.forEach((event) => {
      if (handlers[event]) {
        target.off?.(event, handlers[event])
      }
    })
  }
}
