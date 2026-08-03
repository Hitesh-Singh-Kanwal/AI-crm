'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { extractCrmEmailInnerHtml } from '@/lib/emailSend'

export { extractCrmEmailInnerHtml }

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

/**
 * Plain / lightly marked-up text emails — including CRM outbound HTML chrome
 * and studio footers with inline styles. These should render as a padded text
 * card in the inbox, not a scaled 600px template iframe.
 */
export function isPlainTextEmailHtml(html) {
  const raw = String(html || '').trim()
  if (!raw) return true

  const inner = extractCrmEmailInnerHtml(raw)
  const body = String(inner != null ? inner : raw)
    .replace(/<img[^>]*crm-email-open-pixel[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .trim()

  if (!body) return true
  if (/<(?:img|h[1-6]|ul|ol|li|section|header|footer|style|link|center)\b/i.test(body)) {
    return false
  }
  // Nested layout tables mean a designed template.
  if (/<table\b/i.test(body)) return false
  // Designer templates often use classes; CRM plain compose / footer does not.
  if (/\bclass\s*=/i.test(body) && !/class=["'][^"']*crm-/i.test(body)) return false

  // Inline styles are OK on simple tags (footer spacing / link color).
  const leftovers = body
    .replace(/<\/?(?:p|br|a|span|b|i|strong|em|u|div)\b[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  if (/<[a-z][\s\S]*?>/i.test(leftovers)) return false
  return true
}

/** Use the designed iframe preview only for real templates. */
export function shouldRenderEmailAsRichHtml(html) {
  return isRichEmailHtml(html) && !isPlainTextEmailHtml(html)
}

/**
 * Standard email design width. Media queries are disabled in preview, so 600
 * stays edge-to-edge (no side letterboxing from a wider canvas).
 */
export const EMAIL_DESIGN_WIDTH = 600

/**
 * Disable @media blocks in preview so mobile styles never reflow the canvas.
 */
export function disableEmailMediaQueriesForPreview(html) {
  return String(html || '').replace(/@media[^{]+\{/gi, '@media not all {')
}

function buildPreviewHeadGuard(viewportWidth = EMAIL_DESIGN_WIDTH) {
  return `
<meta charset="utf-8"/>
<meta name="color-scheme" content="light only"/>
<meta name="supported-color-schemes" content="light"/>
<meta name="viewport" content="width=${viewportWidth}"/>
<base target="_blank"/>
<style type="text/css" data-crm-preview-guard="1">
  :root{color-scheme:light only;}
  html,body{margin:0;padding:0;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;}
  img{max-width:100%;height:auto;}
  img[data-crm-img="1"]{width:100%;}
  img[data-crm-play="1"]{width:64px !important;height:64px !important;max-width:64px !important;display:inline-block !important;}
  a{color:#2563eb;}
  table{border-collapse:collapse;}
</style>
`.trim()
}

function injectPreviewGuard(html, viewportWidth = EMAIL_DESIGN_WIDTH) {
  const source = String(html || '')
  const guard = buildPreviewHeadGuard(viewportWidth)
  if (/data-crm-preview-guard\s*=\s*["']?1["']?/i.test(source)) {
    return disableEmailMediaQueriesForPreview(source)
  }
  let next = source
  if (/<\/head>/i.test(next)) {
    next = next.replace(/<\/head>/i, `${guard}</head>`)
  } else if (/<body[\s>]/i.test(next)) {
    next = next.replace(/<body([\s>])/i, `<head>${guard}</head><body$1`)
  }
  return disableEmailMediaQueriesForPreview(next)
}

function wrapSrcDoc(html, viewportWidth = EMAIL_DESIGN_WIDTH) {
  const body = String(html || '')
  if (/<html[\s>]/i.test(body) || /<!doctype/i.test(body)) {
    return injectPreviewGuard(body, viewportWidth)
  }

  return disableEmailMediaQueriesForPreview(`<!DOCTYPE html><html><head>
${buildPreviewHeadGuard(viewportWidth)}
</head><body style="margin:0;padding:0;">${body}</body></html>`)
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
  fitContent = false,
  layoutWidth = null,
  onHeightChange,
}) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(minHeight)
  const onHeightChangeRef = useRef(onHeightChange)
  onHeightChangeRef.current = onHeightChange
  const srcDoc = wrapSrcDoc(html, layoutWidth || EMAIL_DESIGN_WIDTH)

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
      className={cn('border-0 bg-transparent block', layoutWidth ? '' : 'w-full', className)}
      style={{
        height,
        overflow: fitContent ? 'hidden' : 'auto',
        width: layoutWidth ? `${layoutWidth}px` : '100%',
        maxWidth: layoutWidth ? `${layoutWidth}px` : undefined,
      }}
    />
  )
}

/**
 * Renders email at design width, then CSS-scales to the container.
 * Contained with min-w-0 / overflow so inbox flex layout (profile panel) is not pushed.
 */
export function ScaledInboxHtmlEmail({
  html,
  title = 'Email preview',
  className,
  minHeight = 120,
  maxHeight = 340,
  viewportHeight: fixedViewportHeight = null,
  designWidth = EMAIL_DESIGN_WIDTH,
}) {
  const widthRef = useRef(null)
  const [screenWidth, setScreenWidth] = useState(designWidth)
  const [contentHeight, setContentHeight] = useState(minHeight)

  useEffect(() => {
    setContentHeight(minHeight)
  }, [html, minHeight])

  useEffect(() => {
    const el = widthRef.current
    if (!el) return undefined
    const update = () => setScreenWidth(el.clientWidth || designWidth)
    update()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [designWidth])

  const scale = Math.min(1, screenWidth / designWidth)
  const scaledHeight = Math.max(contentHeight * scale, minHeight)
  const viewportHeight =
    fixedViewportHeight != null
      ? fixedViewportHeight
      : Math.min(scaledHeight, maxHeight)

  const handleHeight = useCallback(
    (h) => {
      setContentHeight(Math.max(minHeight, Number(h) || minHeight))
    },
    [minHeight],
  )

  return (
    <div
      ref={widthRef}
      className={cn('w-full min-w-0 max-w-full overflow-hidden', className)}
    >
      <div
        className="min-w-0 max-w-full overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{
          height: viewportHeight,
          maxHeight: fixedViewportHeight != null ? fixedViewportHeight : maxHeight,
          width: '100%',
        }}
      >
        {/* Clip box reports only the scaled size to layout (prevents 600px flex blowout). */}
        <div
          className="relative overflow-hidden"
          style={{
            height: scaledHeight,
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <div
            className="origin-top-left"
            style={{
              width: designWidth,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              // After scale, layout space still "wants" designWidth — contain via parent clip.
              willChange: 'transform',
            }}
          >
            <InboxHtmlEmailFrame
              html={html}
              title={title}
              minHeight={minHeight}
              fitContent
              layoutWidth={designWidth}
              onHeightChange={handleHeight}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
