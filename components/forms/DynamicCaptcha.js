'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Volume2, ShieldCheck, EyeOff, RefreshCw, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Photo banks for image CAPTCHA (Unsplash CDN — no API key).
 * Inspired by image-based CAPTCHA patterns described by Imperva:
 * https://www.imperva.com/learn/application-security/what-is-captcha/
 */
export const CAPTCHA_IMAGE_THEMES = [
  {
    id: 'cat',
    label: 'cats',
    images: [
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1495360010541-f87222d7ab7b?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'dog',
    label: 'dogs',
    images: [
      'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'car',
    label: 'cars',
    images: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1542362567-b07e54358753?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1583121274602-3e282f38bc1f?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop',
    ],
  },
  {
    id: 'plant',
    label: 'plants',
    images: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1485955900006-10f2d1722ce7?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1463936576869-a042b7ad00a2?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=200&h=200&fit=crop',
    ],
  },
]

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)]
}

export function generateTextCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < length; i += 1) out += chars[randInt(0, chars.length - 1)]
  return out
}

export function generateMathChallenge() {
  const op = Math.random() > 0.45 ? '+' : '-'
  if (op === '+') {
    const a = randInt(1, 12)
    const b = randInt(1, 12)
    return { prompt: `${a} + ${b}`, answer: String(a + b) }
  }
  const a = randInt(5, 15)
  const b = randInt(1, a)
  return { prompt: `${a} - ${b}`, answer: String(a - b) }
}

export function generateImageChallenge() {
  const target = pick(CAPTCHA_IMAGE_THEMES)
  const others = CAPTCHA_IMAGE_THEMES.filter((t) => t.id !== target.id)
  const cells = []
  let correctCount = 0
  const targetCount = randInt(2, 4)
  const usedUrls = new Set()

  const nextUrl = (theme) => {
    let url = pick(theme.images)
    let guard = 0
    while (usedUrls.has(url) && guard < 12) {
      url = pick(theme.images)
      guard += 1
    }
    usedUrls.add(url)
    return url
  }

  for (let i = 0; i < 9; i += 1) {
    const remaining = 9 - i
    const stillNeed = targetCount - correctCount
    const mustPickTarget = stillNeed > 0 && stillNeed >= remaining
    const pickTarget =
      mustPickTarget || (correctCount < targetCount && Math.random() < 0.4)
    const theme = pickTarget ? target : pick(others)
    if (theme.id === target.id) correctCount += 1
    cells.push({
      index: i,
      themeId: theme.id,
      url: nextUrl(theme),
      correct: theme.id === target.id,
    })
  }

  if (correctCount === 0) {
    const idx = randInt(0, 8)
    cells[idx] = {
      index: idx,
      themeId: target.id,
      url: nextUrl(target),
      correct: true,
    }
  }

  return {
    targetId: target.id,
    targetLabel: target.label,
    referenceUrl: nextUrl(target),
    cells,
  }
}

/** Draw distorted text CAPTCHA onto a canvas (Imperva-style alienation). */
export function drawTextCaptcha(canvas, code, styleIndex) {
  if (!canvas) return
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const styles = [
    // 1. Grainy grayscale
    {
      bg: ['#d4d4d4', '#e8e8e8'],
      colors: ['#2a2a2a', '#3f3f3f', '#1a1a1a'],
      noise: 'dots',
      lines: 4,
      blur: 0,
    },
    // 2. Colorful scribble
    {
      bg: ['#ffffff', '#fafafa'],
      colors: ['#2563eb', '#7c3aed', '#db2777', '#ca8a04', '#16a34a'],
      noise: 'scribbles',
      lines: 18,
      blur: 0,
    },
    // 3. Yellow / soft wave
    {
      bg: ['#fde047', '#facc15'],
      colors: ['#38bdf8', '#0ea5e9', '#0284c7'],
      noise: 'blobs',
      lines: 3,
      blur: 0.4,
    },
    // 4. Dark teal grid
    {
      bg: ['#0f766e', '#134e4a'],
      colors: ['#ffffff', '#ccfbf1', '#99f6e4'],
      noise: 'grid',
      lines: 2,
      blur: 0,
      outline: true,
    },
    // 5. Blurred with strike-through
    {
      bg: ['#e5e7eb', '#f3f4f6'],
      colors: ['#111827', '#1f2937'],
      noise: 'dots',
      lines: 1,
      strike: true,
      blur: 1.2,
    },
    // 6. Warped black/white
    {
      bg: ['#f8fafc', '#e2e8f0'],
      colors: ['#0f172a', '#334155'],
      noise: 'waveblob',
      lines: 5,
      blur: 0,
    },
  ]

  const style = styles[((styleIndex % styles.length) + styles.length) % styles.length]

  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, style.bg[0])
  grad.addColorStop(1, style.bg[1] || style.bg[0])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)

  // Background noise
  if (style.noise === 'dots') {
    for (let i = 0; i < 420; i += 1) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`
      ctx.fillRect(randInt(0, w), randInt(0, h), 1, 1)
    }
  } else if (style.noise === 'scribbles') {
    for (let i = 0; i < style.lines; i += 1) {
      ctx.strokeStyle = pick(style.colors)
      ctx.globalAlpha = 0.35
      ctx.lineWidth = randInt(1, 2)
      ctx.beginPath()
      ctx.moveTo(randInt(0, w), randInt(0, h))
      for (let j = 0; j < 4; j += 1) {
        ctx.quadraticCurveTo(
          randInt(0, w),
          randInt(0, h),
          randInt(0, w),
          randInt(0, h)
        )
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  } else if (style.noise === 'blobs') {
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = `rgba(56, 189, 248, ${0.15 + Math.random() * 0.2})`
      ctx.beginPath()
      ctx.arc(randInt(0, w), randInt(0, h), randInt(12, 36), 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (style.noise === 'grid') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.setLineDash([3, 4])
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 14) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 14) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.setLineDash([])
  } else if (style.noise === 'waveblob') {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.45)'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.55)
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, h * 0.55 + Math.sin(x / 18) * 10)
    }
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()
  }

  // Interference arcs / lines under text
  for (let i = 0; i < (style.lines || 0); i += 1) {
    ctx.strokeStyle = pick(style.colors)
    ctx.globalAlpha = 0.45
    ctx.lineWidth = randInt(1, 2)
    ctx.beginPath()
    ctx.moveTo(randInt(0, w / 3), randInt(0, h))
    ctx.bezierCurveTo(
      randInt(0, w),
      randInt(0, h),
      randInt(0, w),
      randInt(0, h),
      randInt((2 * w) / 3, w),
      randInt(0, h)
    )
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  const chars = String(code).split('')
  const slot = w / (chars.length + 1)
  chars.forEach((ch, i) => {
    const x = slot * (i + 1)
    const y = h / 2 + randInt(-6, 6)
    const angle = ((randInt(-28, 28) * Math.PI) / 180)
    const size = randInt(22, 30)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    if (style.blur) ctx.filter = `blur(${style.blur}px)`
    ctx.font = `bold ${size}px "Courier New", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const color = pick(style.colors)
    if (style.outline) {
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.strokeText(ch, 0, 0)
    } else {
      ctx.fillStyle = color
      ctx.fillText(ch, 0, 0)
    }
    ctx.restore()
    ctx.filter = 'none'
  })

  if (style.strike) {
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(8, h * 0.55)
    for (let x = 8; x < w - 8; x += 6) {
      ctx.lineTo(x, h * 0.55 + Math.sin(x / 10) * 4)
    }
    ctx.stroke()
  }

  // Light top noise overlay
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`
    ctx.fillRect(randInt(0, w), randInt(0, h), 2, 2)
  }
}

const CHAR_SPEAK = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
  F: 'F',
  G: 'G',
  H: 'H',
  J: 'J',
  K: 'K',
  L: 'L',
  M: 'M',
  N: 'N',
  P: 'P',
  Q: 'Q',
  R: 'R',
  S: 'S',
  T: 'T',
  U: 'U',
  V: 'V',
  W: 'W',
  X: 'X',
  Y: 'Y',
  Z: 'Z',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
}

/**
 * Speak captcha characters one-by-one via Web Speech API.
 * Handles Chrome cancel/resume bugs and empty voices list.
 */
export function speakCode(code, { onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined') {
    onError?.('unavailable')
    return Promise.reject(new Error('unavailable'))
  }
  if (!window.speechSynthesis) {
    onError?.('unsupported')
    return Promise.reject(new Error('Speech synthesis is not supported in this browser.'))
  }

  const synth = window.speechSynthesis
  const chars = String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('')

  if (!chars.length) {
    onError?.('empty')
    return Promise.reject(new Error('empty'))
  }

  return new Promise((resolve, reject) => {
    let cancelled = false
    let index = 0

    const finish = (ok) => {
      if (cancelled) return
      cancelled = true
      if (ok) {
        onEnd?.()
        resolve()
      } else {
        onError?.('failed')
        reject(new Error('failed'))
      }
    }

    const speakNext = () => {
      if (cancelled) return
      if (index >= chars.length) {
        finish(true)
        return
      }

      const ch = chars[index]
      index += 1
      const word = CHAR_SPEAK[ch] || ch
      const utter = new SpeechSynthesisUtterance(word)
      utter.rate = 0.8
      utter.pitch = 1
      utter.volume = 1
      utter.lang = 'en-US'

      const voices = synth.getVoices()
      const en =
        voices.find((v) => /^en(-|_)/i.test(v.lang) && /google|samantha|daniel|alex|female|male/i.test(v.name)) ||
        voices.find((v) => /^en(-|_)/i.test(v.lang)) ||
        voices[0]
      if (en) utter.voice = en

      utter.onend = () => {
        setTimeout(speakNext, 220)
      }
      utter.onerror = () => {
        // Skip failed char and continue so one bad voice doesn't kill playback
        setTimeout(speakNext, 220)
      }

      try {
        // Chrome sometimes stays paused after cancel()
        if (synth.paused) synth.resume()
        synth.speak(utter)
      } catch (err) {
        finish(false)
      }
    }

    const start = () => {
      try {
        synth.cancel()
      } catch (_) {
        /* ignore */
      }
      // Important: wait after cancel() or Chrome drops the next utterance
      setTimeout(() => {
        if (cancelled) return
        try {
          if (synth.paused) synth.resume()
        } catch (_) {
          /* ignore */
        }
        onStart?.()
        speakNext()
      }, 120)
    }

    const voices = synth.getVoices()
    if (!voices.length) {
      const onVoices = () => {
        synth.removeEventListener('voiceschanged', onVoices)
        start()
      }
      synth.addEventListener('voiceschanged', onVoices)
      // Force browsers to populate voices
      try {
        synth.getVoices()
      } catch (_) {
        /* ignore */
      }
      // Fallback if voiceschanged never fires
      setTimeout(() => {
        synth.removeEventListener('voiceschanged', onVoices)
        start()
      }, 400)
    } else {
      start()
    }
  })
}

function TextCaptchaCanvas({ code, styleIndex, width = 280, height = 72 }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    drawTextCaptcha(canvas, code, styleIndex)
  }, [code, styleIndex, width, height])

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      className="w-full max-w-full rounded border border-slate-200 bg-white"
      style={{ imageRendering: 'auto' }}
    />
  )
}

/**
 * Interactive / live captcha used in builder canvas + React preview.
 */
export function DynamicCaptcha({ field, interactive = false, className }) {
  const captchaType = field?.captchaType || 'robot'
  const label = field?.label
  const [seed, setSeed] = useState(0)
  const [answer, setAnswer] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [robotChecked, setRobotChecked] = useState(false)
  const [status, setStatus] = useState('')
  const [verified, setVerified] = useState(false)
  const [invisibleReady, setInvisibleReady] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const startRef = useRef(Date.now())

  const playAudioCode = useCallback(
    async (code) => {
      if (isSpeaking) return
      try {
        setIsSpeaking(true)
        setStatus('')
        await speakCode(code, {
          onError: () => {
            setStatus('Could not play audio. Check that sound is on and speech is allowed in your browser.')
          },
        })
      } catch (_) {
        setStatus('Could not play audio. Check that sound is on and speech is allowed in your browser.')
      } finally {
        setIsSpeaking(false)
      }
    },
    [isSpeaking]
  )

  const challenge = useMemo(() => {
    if (captchaType === 'math') return { kind: 'math', ...generateMathChallenge() }
    if (captchaType === 'text' || captchaType === 'audio') {
      return {
        kind: captchaType,
        code: generateTextCode(captchaType === 'text' ? 6 : 5),
        styleIndex: seed,
      }
    }
    if (captchaType === 'images') {
      return { kind: 'images', ...generateImageChallenge() }
    }
    return { kind: captchaType }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captchaType, seed])

  const refresh = useCallback((e) => {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    setSeed((s) => s + 1)
    setAnswer('')
    setSelected(new Set())
    setRobotChecked(false)
    setStatus('')
    setVerified(false)
  }, [])

  useEffect(() => {
    setSeed((s) => s + 1)
    setAnswer('')
    setSelected(new Set())
    setRobotChecked(false)
    setStatus('')
    setVerified(false)
    setInvisibleReady(false)
    startRef.current = Date.now()
  }, [captchaType])

  useEffect(() => {
    if (captchaType !== 'invisible') return undefined
    const t = setTimeout(() => setInvisibleReady(true), 900)
    return () => clearTimeout(t)
  }, [captchaType, seed])

  const toggleImage = (index) => {
    if (!interactive || verified) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setStatus('')
  }

  const verify = () => {
    if (captchaType === 'robot') return robotChecked
    if (captchaType === 'invisible') {
      return invisibleReady && Date.now() - startRef.current > 600
    }
    if (captchaType === 'math') {
      return String(answer).trim() === String(challenge.answer)
    }
    if (captchaType === 'text' || captchaType === 'audio') {
      return String(answer).trim().toUpperCase() === String(challenge.code).toUpperCase()
    }
    if (captchaType === 'images') {
      const correct = challenge.cells.filter((c) => c.correct).map((c) => c.index)
      if (selected.size !== correct.length) return false
      return correct.every((i) => selected.has(i))
    }
    return true
  }

  const onVerifyClick = (e) => {
    e?.stopPropagation?.()
    const ok = verify()
    if (ok) {
      setVerified(true)
      setStatus('')
    } else {
      setVerified(false)
      setStatus('Try again — challenge refreshed.')
      refresh()
    }
  }

  // —— Image CAPTCHA (reCAPTCHA-style widget) ——
  if (captchaType === 'images') {
    return (
      <div
        className={cn(
          'overflow-hidden rounded border border-slate-300 bg-white shadow-sm',
          !interactive && 'pointer-events-none',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-[#1a73e8] px-3 py-2.5 text-white">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-snug">
              Select all images below that match this one:
            </p>
          </div>
          {challenge.referenceUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={challenge.referenceUrl}
              alt={challenge.targetLabel}
              className="h-14 w-14 shrink-0 rounded-sm object-cover ring-2 ring-white/40"
            />
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-0.5 bg-white p-0.5">
          {(challenge.cells || []).map((cell) => {
            const isOn = selected.has(cell.index)
            return (
              <button
                key={cell.index}
                type="button"
                disabled={!interactive || verified}
                onClick={() => toggleImage(cell.index)}
                className={cn(
                  'relative aspect-square overflow-hidden bg-slate-100',
                  isOn && 'ring-2 ring-inset ring-[#1a73e8]'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cell.url}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {isOn ? (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a73e8] text-[10px] font-bold text-white">
                    ✓
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1 border-t border-slate-200 bg-white px-2 py-1.5">
          <button
            type="button"
            title="New challenge"
            onClick={refresh}
            className={cn(
              'rounded-full p-2 text-slate-500 hover:bg-slate-100',
              !interactive && 'pointer-events-auto'
            )}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Audio"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              playAudioCode(challenge.targetLabel || 'cat')
            }}
            className={cn(
              'rounded-full p-2 text-slate-500 hover:bg-slate-100',
              !interactive && 'pointer-events-auto',
              isSpeaking && 'animate-pulse text-[#1a73e8]'
            )}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <span className="rounded-full p-2 text-slate-400">
            <Info className="h-4 w-4" />
          </span>
          <div className="flex-1" />
          {interactive ? (
            <button
              type="button"
              onClick={onVerifyClick}
              disabled={verified}
              className={cn(
                'rounded px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white',
                verified ? 'bg-emerald-600' : 'bg-[#4a89f3] hover:bg-[#1a73e8]'
              )}
            >
              {verified ? 'Verified' : 'Verify'}
            </button>
          ) : (
            <span className="rounded bg-[#4a89f3] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
              Verify
            </span>
          )}
        </div>
        {status ? <p className="px-3 pb-2 text-[11px] text-red-600">{status}</p> : null}
      </div>
    )
  }

  // —— Text / Audio CAPTCHA ——
  if (captchaType === 'text' || captchaType === 'audio') {
    return (
      <div
        className={cn(
          'rounded-md border border-slate-300 bg-white p-3 shadow-sm',
          !interactive && 'pointer-events-none',
          className
        )}
        onClick={(e) => interactive && e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">
            {label ||
              (captchaType === 'audio'
                ? 'Listen and type the code'
                : 'Enter the characters you see')}
          </p>
          <button
            type="button"
            onClick={refresh}
            className={cn(
              'rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600',
              !interactive && 'pointer-events-auto'
            )}
            title="New challenge"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {captchaType === 'text' ? (
          <TextCaptchaCanvas code={challenge.code} styleIndex={challenge.styleIndex || seed} />
        ) : (
          <div className="mb-2 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-3">
            <button
              type="button"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-white hover:bg-[#1557b0]',
                'pointer-events-auto relative z-10',
                isSpeaking && 'animate-pulse ring-2 ring-[#1a73e8]/40'
              )}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                playAudioCode(challenge.code)
              }}
              title="Play audio"
            >
              <Volume2 className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600">
                {isSpeaking ? 'Playing… listen carefully' : 'Press play, then type the characters you hear.'}
              </p>
            </div>
          </div>
        )}

        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={!interactive || verified}
          placeholder="Type the characters…"
          className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm tracking-widest"
          autoComplete="off"
        />
        {interactive ? (
          <button
            type="button"
            onClick={onVerifyClick}
            disabled={verified}
            className={cn(
              'mt-2 rounded px-3 py-1.5 text-xs font-semibold uppercase text-white',
              verified ? 'bg-emerald-600' : 'bg-[#4a89f3] hover:bg-[#1a73e8]'
            )}
          >
            {verified ? 'Verified' : 'Verify'}
          </button>
        ) : null}
        {status ? <p className="mt-1.5 text-[11px] text-red-600">{status}</p> : null}
      </div>
    )
  }

  if (captchaType === 'math') {
    return (
      <div
        className={cn(
          'rounded-md border border-slate-300 bg-slate-50 p-3',
          !interactive && 'pointer-events-none',
          className
        )}
        onClick={(e) => interactive && e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">
            {label || 'Solve the math problem'}
          </p>
          <button
            type="button"
            onClick={refresh}
            className={cn(
              'rounded p-1 text-slate-400 hover:bg-white',
              !interactive && 'pointer-events-auto'
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
            {challenge.prompt} =
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!interactive}
            placeholder="?"
            className="h-9 w-20 rounded-md border border-slate-300 bg-white px-2 text-sm"
          />
        </div>
        {interactive ? (
          <button
            type="button"
            onClick={onVerifyClick}
            className="mt-2 rounded bg-[#4a89f3] px-3 py-1.5 text-xs font-semibold uppercase text-white"
          >
            Verify
          </button>
        ) : null}
        {status ? <p className="mt-1.5 text-[11px] text-red-600">{status}</p> : null}
      </div>
    )
  }

  if (captchaType === 'invisible') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50/80 px-3 py-3',
          className
        )}
      >
        <EyeOff className="h-5 w-5 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-700">
            {label || 'Protected by invisible captcha'}
          </p>
          <p className="text-[11px] text-slate-400">
            {invisibleReady ? 'Verified in the background' : 'Checking browser signals…'}
          </p>
        </div>
        {invisibleReady ? (
          <span className="text-[11px] font-medium text-emerald-600">Ready</span>
        ) : (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
        )}
      </div>
    )
  }

  // robot — No CAPTCHA reCAPTCHA style
  return (
    <label
      className={cn(
        'flex max-w-[320px] items-center gap-3 rounded border border-slate-300 bg-[#f9f9f9] px-3 py-3 shadow-sm',
        interactive ? 'cursor-pointer' : 'pointer-events-none',
        className
      )}
      onClick={(e) => interactive && e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={robotChecked}
        onChange={(e) => setRobotChecked(e.target.checked)}
        disabled={!interactive}
        className="h-5 w-5 accent-[#1a73e8]"
      />
      <span className="flex-1 text-sm text-slate-800">
        {label || "I'm not a robot"}
      </span>
      <span className="flex flex-col items-center text-[9px] leading-tight text-slate-400">
        <ShieldCheck className="mb-0.5 h-6 w-6 text-[#1a73e8]" />
        reCAPTCHA
      </span>
    </label>
  )
}

export function getCaptchaExportMarkup(field) {
  const captchaType = field?.captchaType || 'robot'
  const id = String(field?.id || 'captcha').replace(/"/g, '')

  return `
      <div class="crm-captcha" id="crm-captcha-${id}" data-captcha-type="${captchaType}" data-required="1" style="margin-bottom:1rem;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div class="crm-captcha-body"></div>
        <p class="crm-captcha-error" style="display:none;margin:0.5rem 0 0;font-size:0.75rem;color:#dc2626;"></p>
      </div>`
}

/** Full client runtime for exported HTML forms. */
export function getCaptchaExportRuntimeScript() {
  // Themes serialized for the export bundle
  const themesJson = JSON.stringify(CAPTCHA_IMAGE_THEMES)

  return `
      (function() {
        var THEMES = ${themesJson};
        function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
        function pick(arr) { return arr[rand(0, arr.length - 1)]; }
        function textCode(n) {
          var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '', i;
          for (i = 0; i < (n || 6); i++) s += chars[rand(0, chars.length - 1)];
          return s;
        }
        function mathChallenge() {
          if (Math.random() > 0.45) {
            var a = rand(1, 12), b = rand(1, 12);
            return { prompt: a + ' + ' + b, answer: String(a + b) };
          }
          var x = rand(5, 15), y = rand(1, x);
          return { prompt: x + ' - ' + y, answer: String(x - y) };
        }
        function imageChallenge() {
          var target = pick(THEMES);
          var others = THEMES.filter(function(t) { return t.id !== target.id; });
          var cells = [], correctCount = 0, targetCount = rand(2, 4), used = {}, i;
          function nextUrl(theme) {
            var url = pick(theme.images), g = 0;
            while (used[url] && g < 12) { url = pick(theme.images); g++; }
            used[url] = 1;
            return url;
          }
          for (i = 0; i < 9; i++) {
            var remaining = 9 - i, stillNeed = targetCount - correctCount;
            var must = stillNeed > 0 && stillNeed >= remaining;
            var doTarget = must || (correctCount < targetCount && Math.random() < 0.4);
            var theme = doTarget ? target : pick(others);
            if (theme.id === target.id) correctCount++;
            cells.push({ index: i, themeId: theme.id, url: nextUrl(theme), correct: theme.id === target.id });
          }
          if (correctCount === 0) {
            var idx = rand(0, 8);
            cells[idx] = { index: idx, themeId: target.id, url: nextUrl(target), correct: true };
          }
          return { targetLabel: target.label, referenceUrl: nextUrl(target), cells: cells };
        }
        function speak(code) {
          if (!window.speechSynthesis) {
            alert('Audio is not supported in this browser.');
            return;
          }
          var synth = window.speechSynthesis;
          var map = { '2':'two','3':'three','4':'four','5':'five','6':'six','7':'seven','8':'eight','9':'nine' };
          var chars = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').split('');
          if (!chars.length) return;
          var i = 0;
          function next() {
            if (i >= chars.length) return;
            var ch = chars[i++];
            var u = new SpeechSynthesisUtterance(map[ch] || ch);
            u.rate = 0.8; u.pitch = 1; u.volume = 1; u.lang = 'en-US';
            var voices = synth.getVoices();
            var en = voices.find(function(v){ return /^en(-|_)/i.test(v.lang); }) || voices[0];
            if (en) u.voice = en;
            u.onend = function(){ setTimeout(next, 220); };
            u.onerror = function(){ setTimeout(next, 220); };
            try { if (synth.paused) synth.resume(); synth.speak(u); } catch (e) {}
          }
          try { synth.cancel(); } catch (e) {}
          setTimeout(function() {
            try { if (synth.paused) synth.resume(); } catch (e) {}
            if (!synth.getVoices().length) {
              var once = function(){ synth.removeEventListener('voiceschanged', once); next(); };
              synth.addEventListener('voiceschanged', once);
              setTimeout(next, 400);
            } else next();
          }, 120);
        }
        function drawTextCaptcha(canvas, code, styleIndex) {
          var w = canvas.width, h = canvas.height, ctx = canvas.getContext('2d');
          if (!ctx) return;
          var styles = [
            { bg:['#d4d4d4','#e8e8e8'], colors:['#2a2a2a','#3f3f3f'], noise:'dots', lines:4 },
            { bg:['#ffffff','#fafafa'], colors:['#2563eb','#7c3aed','#db2777','#ca8a04'], noise:'scribbles', lines:18 },
            { bg:['#fde047','#facc15'], colors:['#38bdf8','#0ea5e9'], noise:'blobs', lines:3, blur:0.4 },
            { bg:['#0f766e','#134e4a'], colors:['#ffffff','#ccfbf1'], noise:'grid', lines:2, outline:true },
            { bg:['#e5e7eb','#f3f4f6'], colors:['#111827'], noise:'dots', lines:1, strike:true, blur:1.2 },
            { bg:['#f8fafc','#e2e8f0'], colors:['#0f172a'], noise:'waveblob', lines:5 }
          ];
          var style = styles[((styleIndex % styles.length) + styles.length) % styles.length];
          var grad = ctx.createLinearGradient(0,0,w,h);
          grad.addColorStop(0, style.bg[0]);
          grad.addColorStop(1, style.bg[1] || style.bg[0]);
          ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
          var i, j, x, y;
          if (style.noise === 'dots') {
            for (i = 0; i < 420; i++) { ctx.fillStyle = 'rgba(0,0,0,' + (Math.random()*0.25) + ')'; ctx.fillRect(rand(0,w), rand(0,h), 1, 1); }
          } else if (style.noise === 'scribbles') {
            for (i = 0; i < style.lines; i++) {
              ctx.strokeStyle = pick(style.colors); ctx.globalAlpha = 0.35; ctx.lineWidth = rand(1,2);
              ctx.beginPath(); ctx.moveTo(rand(0,w), rand(0,h));
              for (j = 0; j < 4; j++) ctx.quadraticCurveTo(rand(0,w), rand(0,h), rand(0,w), rand(0,h));
              ctx.stroke(); ctx.globalAlpha = 1;
            }
          } else if (style.noise === 'blobs') {
            for (i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(56,189,248,' + (0.15+Math.random()*0.2) + ')'; ctx.beginPath(); ctx.arc(rand(0,w), rand(0,h), rand(12,36), 0, Math.PI*2); ctx.fill(); }
          } else if (style.noise === 'grid') {
            ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([3,4]); ctx.lineWidth = 1;
            for (x = 0; x < w; x += 14) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
            for (y = 0; y < h; y += 14) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
            ctx.setLineDash([]);
          } else if (style.noise === 'waveblob') {
            ctx.fillStyle = 'rgba(148,163,184,0.45)'; ctx.beginPath(); ctx.moveTo(0, h*0.55);
            for (x = 0; x <= w; x += 8) ctx.lineTo(x, h*0.55 + Math.sin(x/18)*10);
            ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
          }
          for (i = 0; i < (style.lines||0); i++) {
            ctx.strokeStyle = pick(style.colors); ctx.globalAlpha = 0.45; ctx.lineWidth = rand(1,2);
            ctx.beginPath(); ctx.moveTo(rand(0,w/3), rand(0,h));
            ctx.bezierCurveTo(rand(0,w), rand(0,h), rand(0,w), rand(0,h), rand((2*w)/3,w), rand(0,h));
            ctx.stroke(); ctx.globalAlpha = 1;
          }
          var chars = String(code).split(''), slot = w / (chars.length + 1);
          chars.forEach(function(ch, idx) {
            var cx = slot * (idx + 1), cy = h/2 + rand(-6,6), angle = (rand(-28,28)*Math.PI)/180, size = rand(22,30);
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
            if (style.blur) ctx.filter = 'blur(' + style.blur + 'px)';
            ctx.font = 'bold ' + size + 'px "Courier New", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            var color = pick(style.colors);
            if (style.outline) { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeText(ch, 0, 0); }
            else { ctx.fillStyle = color; ctx.fillText(ch, 0, 0); }
            ctx.restore(); ctx.filter = 'none';
          });
          if (style.strike) {
            ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, h*0.55);
            for (x = 8; x < w-8; x += 6) ctx.lineTo(x, h*0.55 + Math.sin(x/10)*4);
            ctx.stroke();
          }
        }

        function initCaptcha(root) {
          var type = root.getAttribute('data-captcha-type') || 'robot';
          var body = root.querySelector('.crm-captcha-body');
          var err = root.querySelector('.crm-captcha-error');
          var state = { type: type, answer: null, selected: {}, started: Date.now(), invisibleReady: false, styleIndex: 0 };
          root._crmCaptcha = state;
          function hideErr() { if (err) { err.style.display = 'none'; err.textContent = ''; } }
          function showErr(msg) { if (err) { err.style.display = 'block'; err.textContent = msg; } }

          function render() {
            hideErr();
            state.selected = {};
            state.answer = null;
            state.styleIndex++;
            if (!body) return;

            if (type === 'robot') {
              body.innerHTML = '<label style="display:flex;align-items:center;gap:0.75rem;max-width:320px;padding:0.75rem;border:1px solid #cbd5e1;border-radius:2px;background:#f9f9f9;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06);">'
                + '<input type="checkbox" class="crm-captcha-robot" style="width:1.25rem;height:1.25rem;accent-color:#1a73e8;" />'
                + '<span style="flex:1;font-size:0.875rem;color:#1e293b;">I\\u2019m not a robot</span>'
                + '<span style="font-size:9px;color:#94a3b8;text-align:center;line-height:1.1;">🛡<br/>reCAPTCHA</span></label>';
              return;
            }
            if (type === 'invisible') {
              state.invisibleReady = false;
              body.innerHTML = '<p style="margin:0;font-size:0.75rem;color:#94a3b8;" class="crm-captcha-inv-status">Checking browser signals…</p>'
                + '<input type="hidden" name="captcha" value="" class="crm-captcha-token" />';
              setTimeout(function() {
                state.invisibleReady = true;
                var st = body.querySelector('.crm-captcha-inv-status');
                var tok = body.querySelector('.crm-captcha-token');
                if (st) st.textContent = 'Verified in the background';
                if (tok) tok.value = 'ok-' + Date.now();
              }, 900);
              return;
            }
            if (type === 'math') {
              var m = mathChallenge();
              state.answer = m.answer;
              body.innerHTML = '<div style="border:1px solid #cbd5e1;border-radius:0.5rem;padding:0.75rem;background:#f8fafc;">'
                + '<div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="font-size:0.875rem;font-weight:500;">Solve the math problem</span>'
                + '<button type="button" class="crm-captcha-refresh" style="border:none;background:transparent;cursor:pointer;">↻</button></div>'
                + '<div style="display:flex;gap:0.5rem;align-items:center;">'
                + '<span style="padding:0.5rem 0.75rem;background:#fff;border:1px solid #e2e8f0;border-radius:0.375rem;font-weight:600;">' + m.prompt + ' =</span>'
                + '<input type="text" class="crm-captcha-input" inputmode="numeric" placeholder="?" style="width:5rem;height:2.25rem;border:1px solid #cbd5e1;border-radius:0.375rem;padding:0 0.75rem;" autocomplete="off" />'
                + '</div><button type="button" class="crm-captcha-verify" style="margin-top:0.5rem;background:#4a89f3;color:#fff;border:none;border-radius:4px;padding:0.35rem 0.85rem;font-size:0.7rem;font-weight:700;text-transform:uppercase;cursor:pointer;">Verify</button></div>';
              body.querySelector('.crm-captcha-refresh').onclick = function(e){ e.preventDefault(); render(); };
              body.querySelector('.crm-captcha-verify').onclick = function(e){ e.preventDefault(); if (!state.validate(true)) return; };
              return;
            }
            if (type === 'text' || type === 'audio') {
              var code = textCode(type === 'text' ? 6 : 5);
              state.answer = code;
              var html = '<div style="border:1px solid #cbd5e1;border-radius:0.5rem;padding:0.75rem;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.05);">'
                + '<div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;"><span style="font-size:0.875rem;font-weight:500;">'
                + (type === 'audio' ? 'Listen and type the code' : 'Enter the characters you see')
                + '</span><button type="button" class="crm-captcha-refresh" style="border:none;background:transparent;cursor:pointer;">↻</button></div>';
              if (type === 'text') {
                html += '<canvas class="crm-captcha-canvas" width="280" height="72" style="width:100%;max-width:280px;border:1px solid #e2e8f0;border-radius:4px;display:block;"></canvas>';
              } else {
                html += '<div style="display:flex;gap:0.5rem;align-items:center;padding:0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.375rem;">'
                  + '<button type="button" class="crm-captcha-play" style="width:2.5rem;height:2.5rem;border-radius:9999px;border:none;background:#1a73e8;color:#fff;cursor:pointer;">▶</button>'
                  + '<span style="font-size:0.75rem;color:#64748b;">Press play, then type the characters you hear.</span></div>';
              }
              html += '<input type="text" class="crm-captcha-input" placeholder="Type the characters…" style="margin-top:0.5rem;width:100%;height:2.25rem;border:1px solid #cbd5e1;border-radius:0.375rem;padding:0 0.75rem;box-sizing:border-box;letter-spacing:0.15em;" autocomplete="off" />'
                + '<button type="button" class="crm-captcha-verify" style="margin-top:0.5rem;background:#4a89f3;color:#fff;border:none;border-radius:4px;padding:0.35rem 0.85rem;font-size:0.7rem;font-weight:700;text-transform:uppercase;cursor:pointer;">Verify</button></div>';
              body.innerHTML = html;
              if (type === 'text') {
                var canvas = body.querySelector('.crm-captcha-canvas');
                drawTextCaptcha(canvas, code, state.styleIndex);
              } else {
                body.querySelector('.crm-captcha-play').onclick = function(){ speak(code); };
              }
              body.querySelector('.crm-captcha-refresh').onclick = function(e){ e.preventDefault(); render(); };
              body.querySelector('.crm-captcha-verify').onclick = function(e){ e.preventDefault(); state.validate(true); };
              return;
            }
            if (type === 'images') {
              var img = imageChallenge();
              state.answer = img.cells.filter(function(c){ return c.correct; }).map(function(c){ return c.index; });
              var html2 = '<div style="border:1px solid #cbd5e1;border-radius:2px;overflow:hidden;background:#fff;max-width:304px;box-shadow:0 1px 3px rgba(0,0,0,.12);">'
                + '<div style="display:flex;align-items:center;gap:0.75rem;background:#1a73e8;color:#fff;padding:0.65rem 0.75rem;">'
                + '<div style="flex:1;font-size:13px;font-weight:500;line-height:1.3;">Select all images below that match this one:</div>'
                + '<img src="' + img.referenceUrl + '" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:2px;border:2px solid rgba(255,255,255,.4);" />'
                + '</div>'
                + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:2px;background:#fff;">';
              img.cells.forEach(function(cell) {
                html2 += '<button type="button" class="crm-captcha-img" data-index="' + cell.index + '" style="aspect-ratio:1;padding:0;border:none;cursor:pointer;position:relative;overflow:hidden;background:#f1f5f9;">'
                  + '<img src="' + cell.url + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" draggable="false" />'
                  + '</button>';
              });
              html2 += '</div><div style="display:flex;align-items:center;gap:0.15rem;padding:0.35rem 0.5rem;border-top:1px solid #e2e8f0;">'
                + '<button type="button" class="crm-captcha-refresh" title="Refresh" style="border:none;background:transparent;cursor:pointer;padding:0.4rem;color:#64748b;font-size:1rem;">↻</button>'
                + '<button type="button" class="crm-captcha-play" title="Audio" style="border:none;background:transparent;cursor:pointer;padding:0.4rem;color:#64748b;">🔊</button>'
                + '<span style="flex:1;"></span>'
                + '<button type="button" class="crm-captcha-verify" style="background:#4a89f3;color:#fff;border:none;border-radius:2px;padding:0.4rem 1rem;font-size:0.7rem;font-weight:700;text-transform:uppercase;cursor:pointer;letter-spacing:0.04em;">Verify</button>'
                + '</div></div>';
              body.innerHTML = html2;
              Array.prototype.forEach.call(body.querySelectorAll('.crm-captcha-img'), function(btn) {
                btn.addEventListener('click', function() {
                  var i = Number(btn.getAttribute('data-index'));
                  if (state.selected[i]) {
                    delete state.selected[i];
                    btn.style.outline = 'none';
                    btn.style.boxShadow = 'none';
                  } else {
                    state.selected[i] = true;
                    btn.style.outline = '3px solid #1a73e8';
                    btn.style.outlineOffset = '-3px';
                  }
                });
              });
              body.querySelector('.crm-captcha-refresh').onclick = function(e){ e.preventDefault(); render(); };
              body.querySelector('.crm-captcha-play').onclick = function(){ speak(img.targetLabel); };
              body.querySelector('.crm-captcha-verify').onclick = function(e){ e.preventDefault(); state.validate(true); };
            }
          }

          state.verified = false;
          state.validate = function(fromBtn) {
            var required = root.getAttribute('data-required') === '1';
            if (type === 'robot') {
              var box = body.querySelector('.crm-captcha-robot');
              if (required && (!box || !box.checked)) { showErr('Please confirm you are not a robot.'); return false; }
              state.verified = true; return true;
            }
            if (type === 'invisible') {
              if (!state.invisibleReady || (Date.now() - state.started) < 500) {
                showErr('Please wait a moment while we verify your browser.'); return false;
              }
              state.verified = true; return true;
            }
            if (type === 'images') {
              var expected = (state.answer || []).slice().sort(function(a,b){return a-b;});
              var picked = Object.keys(state.selected).map(Number).sort(function(a,b){return a-b;});
              var ok = picked.length === expected.length && picked.every(function(v,i){ return v === expected[i]; });
              if (!ok) { showErr('Please select the correct images.'); if (fromBtn) render(); return false; }
              state.verified = true; hideErr();
              var vbtn = body.querySelector('.crm-captcha-verify');
              if (vbtn) { vbtn.textContent = 'Verified'; vbtn.style.background = '#059669'; }
              return true;
            }
            var input = body.querySelector('.crm-captcha-input');
            var val = input ? String(input.value || '').trim() : '';
            if (!val && required) { showErr('Please complete the captcha.'); return false; }
            var expectedAns = String(state.answer || '');
            var match = (type === 'math') ? val === expectedAns : val.toUpperCase() === expectedAns.toUpperCase();
            if (!match) { showErr('Incorrect answer. A new challenge has been generated.'); render(); return false; }
            state.verified = true; hideErr();
            var vb = body.querySelector('.crm-captcha-verify');
            if (vb) { vb.textContent = 'Verified'; vb.style.background = '#059669'; }
            return true;
          };

          render();
        }

        window.__crmInitCaptchas = function() {
          Array.prototype.forEach.call(document.querySelectorAll('.crm-captcha'), initCaptcha);
        };
        window.__crmValidateCaptchas = function() {
          var nodes = document.querySelectorAll('.crm-captcha');
          for (var i = 0; i < nodes.length; i++) {
            var st = nodes[i]._crmCaptcha;
            if (!st) continue;
            if (st.verified) continue;
            if (typeof st.validate === 'function' && !st.validate(false)) return false;
          }
          return true;
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.__crmInitCaptchas);
        else window.__crmInitCaptchas();
      })();
`
}
