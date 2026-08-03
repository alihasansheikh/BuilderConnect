// Synthesized two-note notification chime via Web Audio — zero assets.
// Autoplay policy: the AudioContext starts suspended until a user gesture;
// a one-time pointerdown/keydown listener resumes it, and plays before that
// are skipped silently.

const MUTE_STORAGE_KEY = 'notification-sound-muted'
const THROTTLE_MS = 2000
const PEAK_GAIN = 0.12

let audioContext: AudioContext | null = null
let unlockRegistered = false
let lastPlayedAt = 0

function registerUnlockListener(): void {
  if (unlockRegistered) return
  unlockRegistered = true
  const unlock = () => {
    audioContext?.resume().catch(() => { /* resume can be retried on the next gesture via a fresh play */ })
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  if (!audioContext) {
    audioContext = new AudioContext()
    registerUnlockListener()
  }
  return audioContext
}

function playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number): void {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startTime)
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, startTime + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + duration)
}

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
  } catch {
    // Storage unavailable (private mode) — sound simply stays on.
  }
}

/** Plays a short two-note chime; no-op when muted, throttled, or before the first user gesture. */
export function playNotificationChime(): void {
  if (isSoundMuted()) return
  const now = Date.now()
  if (now - lastPlayedAt < THROTTLE_MS) return

  const ctx = getAudioContext()
  if (!ctx || ctx.state !== 'running') return

  lastPlayedAt = now
  const start = ctx.currentTime
  playTone(ctx, 880, start, 0.12)
  playTone(ctx, 1174.66, start + 0.09, 0.11)
}
