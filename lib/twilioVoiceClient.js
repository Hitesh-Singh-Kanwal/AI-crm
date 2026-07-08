'use client'

let devicePromise = null
let activeDevice = null

async function loadVoiceSdk() {
  const mod = await import('@twilio/voice-sdk')
  return mod.Device
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

export async function joinConferenceCall({ fetchToken, conferenceName, queueItemId }) {
  const device = await ensureTwilioDevice(fetchToken)
  return device.connect({
    params: {
      conferenceName: String(conferenceName),
      queueItemId: String(queueItemId),
    },
  })
}

export function disconnectAllCalls() {
  activeDevice?.disconnectAll()
}

export function destroyTwilioDevice() {
  disconnectAllCalls()
  activeDevice?.destroy()
  activeDevice = null
  devicePromise = null
}
