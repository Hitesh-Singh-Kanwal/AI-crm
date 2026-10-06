/**
 * The short tone played when a lead joins the human queue. Lives here (not in the
 * Human Queue page) so the Notifications settings can play the very same sound
 * as a preview. Callers decide whether it is allowed to play; this only plays it.
 */
export function playIncomingRing() {
  if (typeof window === 'undefined') return
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.35)
  } catch {
    // audio not available
  }
}
