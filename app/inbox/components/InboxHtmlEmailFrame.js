'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** True when HTML looks like a designed email (not plain-text wrapped in &lt;p&gt;/&lt;br&gt;). */
export function isRichEmailHtml(html) {
  const raw = String(html || '').trim()
  if (!raw) return false
  if (/<!doctype/i.test(raw) || /<html[\s>]/i.test(raw)) return true
  if (/<(?:table|img|h[1-6]|ul|ol|li|section|header|footer|td|tr|style|link|center)\b/i.test(raw)) {
    return true
  }
  if (/style\s*=/i.test(raw) || /class\s*=/i.test(raw)) return true
  const blockTags = raw.match(/<\/?(?:div|section|article|table|h[1-6])\b/gi) || []
  return blockTags.length >= 2
}

function wrapSrcDoc(html) {
  const body = String(html || '')
  if (/<html[\s>]/i.test(body) || /<!doctype/i.test(body)) {
    return body
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base target="_blank"/><style>
    html,body{margin:0;padding:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;}
    img{max-width:100%!important;height:auto!important;display:block;}
    img[data-crm-img="1"]{width:100%!important;}
    img[data-crm-play="1"]{max-width:64px!important;width:64px!important;height:64px!important;}
    a{color:#2563eb;}
    table{max-width:100%;border-collapse:collapse;}
    table[width="100%"]{width:100%;}
  </style></head><body>${body}</body></html>`
}

/**
 * Sandboxed iframe that renders email HTML and auto-sizes to content.
 */
export default function InboxHtmlEmailFrame({
  html,
  title = 'Email preview',
  className,
  minHeight = 120,
  maxHeight = 420,
  /** Grow to full content height (no clamp). */
  fitContent = false,
  /** Fixed layout width for the document (e.g. 600 for email design width). */
  layoutWidth = null,
  /** Called whenever measured content height changes. */
  onHeightChange,
}) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(minHeight)
  const onHeightChangeRef = useRef(onHeightChange)
  onHeightChangeRef.current = onHeightChange
  const srcDoc = wrapSrcDoc(html)

  const measure = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc?.body) return
      const contentHeight = Math.max(
        doc.body.scrollHeight || 0,
        doc.documentElement?.scrollHeight || 0,
        minHeight,
      )
      const next = fitContent
        ? Math.max(contentHeight, minHeight)
        : Math.min(Math.max(contentHeight, minHeight), maxHeight)
      setHeight(next)
      onHeightChangeRef.current?.(next)
    } catch {
      setHeight(minHeight)
      onHeightChangeRef.current?.(minHeight)
    }
  }, [minHeight, maxHeight, fitContent])

  useEffect(() => {
    setHeight(minHeight)
    onHeightChangeRef.current?.(minHeight)

    const timers = [50, 250, 800, 1600].map((ms) => setTimeout(measure, ms))

    const iframe = iframeRef.current
    let ro = null
    let imgCleanups = []

    const bindDocObservers = () => {
      try {
        const doc = iframe?.contentDocument || iframe?.contentWindow?.document
        if (!doc?.body) return
        if (typeof ResizeObserver !== 'undefined') {
          ro = new ResizeObserver(() => measure())
          ro.observe(doc.body)
        }
        doc.querySelectorAll('img').forEach((img) => {
          const onImg = () => measure()
          img.addEventListener('load', onImg)
          img.addEventListener('error', onImg)
          imgCleanups.push(() => {
            img.removeEventListener('load', onImg)
            img.removeEventListener('error', onImg)
          })
        })
      } catch {
        /* cross-origin / sandbox */
      }
    }

    const onLoad = () => {
      measure()
      bindDocObservers()
    }
    iframe?.addEventListener('load', onLoad)
    // srcDoc may already be loaded
    bindDocObservers()

    return () => {
      timers.forEach(clearTimeout)
      iframe?.removeEventListener('load', onLoad)
      ro?.disconnect()
      imgCleanups.forEach((fn) => fn())
    }
  }, [srcDoc, measure, minHeight])

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={srcDoc}
      onLoad={measure}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className={cn('border-0 bg-white block', layoutWidth ? '' : 'w-full', className)}
      style={{
        height,
        overflow: fitContent ? 'hidden' : 'auto',
        width: layoutWidth ? `${layoutWidth}px` : '100%',
        maxWidth: layoutWidth ? `${layoutWidth}px` : undefined,
      }}
    />
  )
}

/** Standard email design width — scaled down to fit narrow inbox cards. */
export const EMAIL_DESIGN_WIDTH = 600

/**
 * Renders email HTML at full design width, then CSS-scales it to the container
 * so templates stay proportionally readable in inbox / composer previews.
 */
export function ScaledInboxHtmlEmail({
  html,
  title = 'Email preview',
  className,
  minHeight = 120,
  maxHeight = 340,
}) {
  const widthRef = useRef(null)
  const [screenWidth, setScreenWidth] = useState(EMAIL_DESIGN_WIDTH)
  const [contentHeight, setContentHeight] = useState(minHeight)

  useEffect(() => {
    setContentHeight(minHeight)
  }, [html, minHeight])

  useEffect(() => {
    const el = widthRef.current
    if (!el) return undefined
    const update = () => setScreenWidth(el.clientWidth || EMAIL_DESIGN_WIDTH)
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const scale = Math.min(1, screenWidth / EMAIL_DESIGN_WIDTH)
  const scaledHeight = Math.max(contentHeight * scale, minHeight)
  const viewportHeight = Math.min(scaledHeight, maxHeight)

  const handleHeight = useCallback(
    (h) => {
      setContentHeight(Math.max(minHeight, Number(h) || minHeight))
    },
    [minHeight],
  )

  return (
    // Outer measures width (no scrollbar). Inner scrolls — avoids scale flicker.
    <div ref={widthRef} className={cn('w-full bg-white', className)}>
      <div
        className="overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ height: viewportHeight, maxHeight }}
      >
        <div className="relative w-full overflow-hidden" style={{ height: scaledHeight }}>
          <div
            className="origin-top-left"
            style={{
              width: EMAIL_DESIGN_WIDTH,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <InboxHtmlEmailFrame
              html={html}
              title={title}
              minHeight={minHeight}
              fitContent
              layoutWidth={EMAIL_DESIGN_WIDTH}
              onHeightChange={handleHeight}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
