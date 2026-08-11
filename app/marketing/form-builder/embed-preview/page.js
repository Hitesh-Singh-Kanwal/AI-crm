'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Code2, Eye, Play, RotateCcw, ExternalLink } from 'lucide-react'

const STORAGE_KEY = 'cadance-embed-preview-code'

const PLACEHOLDER = `<script charset="utf-8" type="text/javascript" src="http://localhost:8080/public/forms/embed.js"></script>
<script>
  CadanceForms.create({
    formId: "YOUR_FORM_ID"
  });
</script>

<!-- Optional: add your own <style> below to customize. Until then the form keeps its original look. -->`

/** Remove HTML comments so example CSS inside <!-- --> is never applied. */
function stripHtmlComments(raw) {
  return String(raw || '').replace(/<!--[\s\S]*?-->/g, '')
}

function extractStyles(raw) {
  // Only live <style> tags outside comments affect the preview.
  const active = stripHtmlComments(raw)
  const styles = []
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi
  let m
  while ((m = styleRe.exec(active))) {
    if (m[1]?.trim()) styles.push(m[1].trim())
  }
  return styles.join('\n\n')
}

/** If host CSS styles inputs but not the phone shell, sync CSS vars so the whole phone control matches. */
function derivePhoneThemeCss(cssText) {
  const css = String(cssText || '')
  if (!css.trim()) return ''

  const pick = (re) => {
    const m = css.match(re)
    return m ? String(m[1]).trim().replace(/\s*!important\s*$/i, '').trim() : ''
  }

  // Prefer explicit vars if already set.
  const existingBg = pick(/--cadance-input-bg\s*:\s*([^;}+]+)/i)
  const existingText = pick(/--cadance-input-text\s*:\s*([^;}+]+)/i)
  const existingBorder = pick(/--cadance-input-border\s*:\s*([^;}+]+)/i)

  // Otherwise infer from input / select rules.
  const blocks = css.match(/[^{}]*\b(input|textarea|select)[^{]*\{[^}]+\}/gi) || []
  let bg = existingBg
  let text = existingText
  let border = existingBorder
  for (const block of blocks) {
    if (!bg) {
      const m = block.match(/background(?:-color)?\s*:\s*([^;}]+)/i)
      if (m) bg = m[1].trim().replace(/\s*!important\s*$/i, '').trim()
    }
    if (!text) {
      const m = block.match(/(?:^|[{;])\s*color\s*:\s*([^;}]+)/i)
      if (m) text = m[1].trim().replace(/\s*!important\s*$/i, '').trim()
    }
    if (!border) {
      const m =
        block.match(/border-color\s*:\s*([^;}]+)/i) ||
        block.match(/border\s*:\s*[^;}]*?\b((?:#|rgb|hsl|transparent)[^;}]*?)\s*(?:!important)?\s*;/i)
      if (m) border = m[1].trim().replace(/\s*!important\s*$/i, '').trim()
    }
  }

  if (!bg && !text && !border) return ''

  const decls = []
  if (bg) decls.push(`--cadance-input-bg: ${bg}`)
  if (text) decls.push(`--cadance-input-text: ${text}`)
  if (border) decls.push(`--cadance-input-border: ${border}`)
  if (text) decls.push(`--cadance-muted-text: ${text}`)

  return `
.cadance-form {
  ${decls.join(';\n  ')};
}
.cadance-form .crm-phone-shell,
.cadance-form .crm-phone-dropdown {
  background: var(--cadance-input-bg) !important;
  background-color: var(--cadance-input-bg) !important;
  color: var(--cadance-input-text) !important;
  border-color: var(--cadance-input-border) !important;
}
.cadance-form .crm-phone-flag-btn {
  background: transparent !important;
  border-color: var(--cadance-input-border) !important;
}
.cadance-form .crm-phone-local,
.cadance-form .crm-phone-dial,
.cadance-form .crm-phone-search {
  color: var(--cadance-input-text) !important;
  background: transparent !important;
}
.cadance-form .crm-phone-label,
.cadance-form .crm-phone-caret {
  color: var(--cadance-muted-text) !important;
}
`.trim()
}

function extractScripts(raw) {
  // Scripts inside HTML comments should not run.
  const active = stripHtmlComments(raw)
  const scripts = []
  const scriptRe = /<script\b[^>]*>[\s\S]*?<\/script>/gi
  let m
  while ((m = scriptRe.exec(active))) scripts.push(m[0])
  return scripts.join('\n')
}

function normalizeHostCss(cssText) {
  return String(cssText || '')
    .replace(/\.cadance-form-wrapper\b/g, '.cadance-form')
    .replace(/#cadance-form\b/g, '.cadance-form')
}

function parseAttr(attrs, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')
  const m = String(attrs || '').match(re)
  return m ? m[1] : ''
}

function enhanceCreateCalls(code, targetSelector) {
  return String(code || '').replace(
    /CadanceForms\.create\(\s*\{/g,
    `CadanceForms.create({ target: ${JSON.stringify(targetSelector)}, `,
  )
}

async function runSnippet(raw, mountEl, applyCss) {
  if (!mountEl) return

  mountEl.innerHTML = ''
  document
    .querySelectorAll(
      'script[data-cadance-preview-asset="1"], style[data-cadance-preview-host-css="1"], style[id^="cadance-form-css-"], style[data-cadance-form]',
    )
    .forEach((n) => n.remove())

  const css = normalizeHostCss(extractStyles(raw))
  const phoneTheme = derivePhoneThemeCss(css)
  applyCss([css, phoneTheme].filter(Boolean).join('\n\n'))

  const scriptHtml = extractScripts(raw)
  if (!scriptHtml) {
    throw new Error('Add your Cadance <script> embed snippet (you can also include a <style> block in the same box).')
  }

  const root = document.createElement('div')
  root.id = 'cadance-embed-preview-root'
  root.className = 'cadance-form cadance-form-wrapper'
  mountEl.appendChild(root)

  const enhanced = enhanceCreateCalls(scriptHtml, '#cadance-embed-preview-root')
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
  const scripts = []
  let match
  while ((match = scriptRe.exec(enhanced))) {
    scripts.push({ attrs: match[1] || '', body: match[2] || '' })
  }

  for (const item of scripts) {
    const src = parseAttr(item.attrs, 'src')
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.setAttribute('data-cadance-preview-asset', '1')
      if (src) {
        if (src.includes('/embed.js') && typeof window.CadanceForms?.create === 'function') {
          resolve()
          return
        }
        el.charset = parseAttr(item.attrs, 'charset') || 'utf-8'
        el.src = src
        el.onload = () => resolve()
        el.onerror = () => reject(new Error(`Failed to load script: ${src}`))
        document.head.appendChild(el)
      } else {
        el.text = item.body
        document.body.appendChild(el)
        resolve()
      }
    })
  }
}

function EmbedPreviewPageInner() {
  const searchParams = useSearchParams()
  const previewRef = useRef(null)
  const hostCssRef = useRef(null)

  const [code, setCode] = useState('')
  const [pageTheme, setPageTheme] = useState('dark')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [rendering, setRendering] = useState(false)
  const [iframeBlocked, setIframeBlocked] = useState(false)

  const applyHostCss = useCallback((cssText) => {
    if (hostCssRef.current?.parentNode) {
      hostCssRef.current.parentNode.removeChild(hostCssRef.current)
      hostCssRef.current = null
    }
    const css = String(cssText || '').trim()
    if (!css) return
    const style = document.createElement('style')
    style.setAttribute('data-cadance-preview-host-css', '1')
    style.textContent = css
    document.head.appendChild(style)
    hostCssRef.current = style
  }, [])

  const renderPreview = useCallback(
    async (raw) => {
      setError('')
      setStatus('')
      const snippet = String(raw || '').trim()
      if (!snippet) {
        setError('Paste your embed code (scripts + optional style) in the box.')
        return
      }
      setRendering(true)
      try {
        localStorage.setItem(STORAGE_KEY, snippet)
        await runSnippet(snippet, previewRef.current, applyHostCss)
        const usedIframe = Boolean(previewRef.current?.querySelector('iframe'))
        setIframeBlocked(usedIframe)
        setStatus(
          usedIframe
            ? 'Form loaded in an iframe — host CSS cannot style it. Use localhost:8080 embed.js (inline mode).'
            : 'Preview updated.',
        )
      } catch (err) {
        setError(err?.message || 'Could not render snippet.')
      } finally {
        setRendering(false)
      }
    },
    [applyHostCss],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const fromStorage = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || ''
        const fromQuery = searchParams?.get('code') || ''
        const initial = fromStorage || (fromQuery ? decodeURIComponent(fromQuery) : '')
        if (!initial) return
        setCode(initial)
        if (!previewRef.current || !/<script\b/i.test(initial)) return
        setRendering(true)
        await runSnippet(initial, previewRef.current, applyHostCss)
        if (!cancelled) {
          const usedIframe = Boolean(previewRef.current.querySelector('iframe'))
          setIframeBlocked(usedIframe)
          setStatus(usedIframe ? 'Form loaded in an iframe — CSS overrides will not apply.' : 'Preview updated.')
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not render snippet.')
      } finally {
        if (!cancelled) setRendering(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, applyHostCss])

  const handleReset = () => {
    setError('')
    setStatus('')
    if (previewRef.current) previewRef.current.innerHTML = ''
    document
      .querySelectorAll(
        'script[data-cadance-preview-asset="1"], style[data-cadance-preview-host-css="1"], style[id^="cadance-form-css-"], style[data-cadance-form]',
      )
      .forEach((n) => n.remove())
    hostCssRef.current = null
    try {
      delete window.CadanceForms
    } catch {
      // ignore
    }
  }

  const themeClass =
    pageTheme === 'light'
      ? 'bg-slate-100 text-slate-900'
      : pageTheme === 'brand'
        ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white'
        : 'bg-slate-950 text-slate-100'

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <header className="border-b border-white/10 bg-black/20 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-70">Cadance · Embed test page</p>
            <h1 className="text-lg font-semibold">Preview how your embed looks on a website</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs opacity-70">Page background</label>
            <select
              value={pageTheme}
              onChange={(e) => setPageTheme(e.target.value)}
              className="rounded-md border border-white/20 bg-black/30 px-2 py-1.5 text-sm"
            >
              <option value="dark">Dark site</option>
              <option value="light">Light site</option>
              <option value="brand">Brand gradient</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {iframeBlocked ? (
          <div className="lg:col-span-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
            Form is still in an iframe, so page CSS cannot reach it. Point the script src to{' '}
            <code className="rounded bg-black/30 px-1">http://localhost:8080/public/forms/embed.js</code>.
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="rounded-xl border border-white/15 bg-black/25 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Code2 className="h-4 w-4" />
              Your website code
            </div>
            <p className="text-xs opacity-70">
              Paste embed scripts here. The form opens with its <strong>original</strong> look.
              Add a real <code>&lt;style&gt;</code> block (not inside a comment) only when you want to customize.
            </p>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={PLACEHOLDER}
              rows={22}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-sky-400/50"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => renderPreview(code)}
              disabled={rendering}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {rendering ? 'Rendering…' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium hover:bg-white/5"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : status ? (
            <p className="text-sm text-emerald-300">{status}</p>
          ) : (
            <p className="text-sm opacity-70">
              Example: scripts first, then a <code>&lt;style&gt;</code> block targeting{' '}
              <code>.cadance-form</code>.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-dashed border-white/25 bg-black/20 min-h-[520px] overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm font-medium">
            <Eye className="h-4 w-4" />
            Live website preview
          </div>
          <div className="flex-1 p-4 sm:p-6">
            <div className="mb-4 text-sm opacity-70">Simulated page content — your form embeds below.</div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Book a class</h2>
            <p className="text-sm opacity-70 mb-6 max-w-prose">
              Edit the code on the left and click Preview to see how it looks with your CSS.
            </p>
            <div
              ref={previewRef}
              className="min-h-[280px] rounded-lg border border-white/10 bg-black/10 p-2"
            />
          </div>
          <div className="border-t border-white/10 px-4 py-2 text-[11px] opacity-60 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Tip: style with <code className="mx-1">.cadance-form</code> selectors
            (labels, inputs, .crm-phone-shell, .submit-btn, …). Use{' '}
            <code className="mx-1">!important</code> when fields have inline styles.
            The export embed snippet includes a full CSS guide comment.
          </div>
        </section>
      </main>
    </div>
  )
}

export default function EmbedPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center text-sm">
          Loading preview…
        </div>
      }
    >
      <EmbedPreviewPageInner />
    </Suspense>
  )
}
