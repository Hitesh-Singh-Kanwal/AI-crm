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
  // If already a full document, use as-is
  if (/<html[\s>]/i.test(body) || /<!doctype/i.test(body)) {
    return body
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><base target="_blank"/><style>
    html,body{margin:0;padding:0;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;}
    img{max-width:100%;height:auto;}
    a{color:#2563eb;}
    table{max-width:100%;}
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
}) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(minHeight)
  const srcDoc = wrapSrcDoc(html)

  const measure = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc?.body) return
      const next = Math.min(
        Math.max(doc.body.scrollHeight || doc.documentElement?.scrollHeight || minHeight, minHeight),
        maxHeight,
      )
      setHeight(next)
    } catch {
      setHeight(minHeight)
    }
  }, [minHeight, maxHeight])

  useEffect(() => {
    setHeight(minHeight)
    const t = setTimeout(measure, 50)
    return () => clearTimeout(t)
  }, [srcDoc, measure, minHeight])

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={srcDoc}
      onLoad={measure}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className={cn('w-full border-0 bg-white block', className)}
      style={{ height, overflow: 'auto' }}
    />
  )
}
