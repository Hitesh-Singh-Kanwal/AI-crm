'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, PanelBottom } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { getEffectiveBranch } from '@/lib/auth'
import {
  buildLocationFooterText,
  filterLocationsForFooterPicker,
  getInjectedFooterLocationId,
  injectFooterIntoHtml,
  locationHasFooterContent,
  stripInjectedFooter,
} from '@/lib/email-footer'
import { cn } from '@/lib/utils'

/**
 * Toolbar icon → dropdown of studio footers.
 * All branches: every location with footer content.
 * Specific branch: only that studio's footer.
 */
export default function EmailFooterPicker({
  html = '',
  onHtmlChange,
  className,
}) {
  const toast = useToast()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [branchId, setBranchId] = useState(() => getEffectiveBranch())
  const [previewId, setPreviewId] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get('/api/location?limit=200').then((res) => {
      if (cancelled) return
      const raw = res?.data
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.locations)
          ? raw.locations
          : Array.isArray(raw?.data)
            ? raw.data
            : []
      if (res.success) setLocations(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const sync = () => setBranchId(getEffectiveBranch())
    window.addEventListener('branch-change', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('branch-change', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const options = useMemo(
    () => filterLocationsForFooterPicker(locations, branchId),
    [locations, branchId],
  )

  const injectedId = useMemo(() => getInjectedFooterLocationId(html), [html])
  const scopedToOne = Boolean(branchId)

  useEffect(() => {
    if (injectedId && options.some((loc) => String(loc._id) === String(injectedId))) {
      setPreviewId(String(injectedId))
      return
    }
    if (options.length === 1) {
      setPreviewId(String(options[0]._id))
      return
    }
    setPreviewId((prev) =>
      options.some((loc) => String(loc._id) === String(prev)) ? prev : '',
    )
  }, [injectedId, options])

  const previewLoc = useMemo(
    () => options.find((loc) => String(loc._id) === String(previewId)) || null,
    [options, previewId],
  )
  const previewText = previewLoc ? buildLocationFooterText(previewLoc) : ''

  const applyFooter = (loc) => {
    if (!onHtmlChange) return
    if (!locationHasFooterContent(loc)) {
      toast.error({
        title: 'Footer empty',
        message: 'This studio has no footer fields set in Studio settings.',
      })
      return
    }
    const next = injectFooterIntoHtml(html, loc)
    if (!getInjectedFooterLocationId(next)) {
      toast.error({
        title: 'Could not add footer',
        message: 'Try again from the HTML tab, or check the template HTML.',
      })
      return
    }
    onHtmlChange(next)
    toast.success({
      title: 'Footer added',
      message: 'Dark footer bar added at the end of the email.',
    })
  }

  const removeFooter = () => {
    if (!onHtmlChange) return
    onHtmlChange(stripInjectedFooter(html))
    toast.success({ title: 'Footer removed' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          title={
            scopedToOne
              ? 'Insert this studio’s footer'
              : 'Insert a studio footer'
          }
          className={cn(
            'h-8 gap-1.5 shrink-0',
            injectedId && 'border-success/40 bg-success/5 text-success hover:bg-success/10',
            className,
          )}
        >
          <PanelBottom className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs font-semibold">Footer</span>
          {injectedId ? (
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] p-0 overflow-hidden"
      >
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-[13px] font-semibold text-foreground inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Studio footer
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {scopedToOne
              ? 'Only this studio’s footer is available. If you skip this, send will add the active branch footer automatically.'
              : 'Choose a location footer to inject. If you skip this, send will add the active branch footer automatically.'}
          </p>
        </div>

        <div className="max-h-56 overflow-y-auto p-1.5">
          {loading ? (
            <p className="px-2 py-3 text-[12px] text-muted-foreground">Loading studios…</p>
          ) : options.length === 0 ? (
            <p className="px-2 py-3 text-[12px] text-muted-foreground">
              {scopedToOne
                ? 'No footer fields set for this studio.'
                : 'No studio footers configured yet.'}
            </p>
          ) : (
            options.map((loc) => {
              const id = String(loc._id)
              const active = String(injectedId || '') === id
              const selected = String(previewId || '') === id
              const usable = locationHasFooterContent(loc)
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!usable}
                  onMouseDown={(e) => {
                    // mousedown so it runs before the menu unmounts on click.
                    e.preventDefault()
                    e.stopPropagation()
                    setPreviewId(id)
                    applyFooter(loc)
                  }}
                  onMouseEnter={() => setPreviewId(id)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                    selected ? 'bg-muted' : 'hover:bg-muted/60',
                    !usable && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      active
                        ? 'border-success bg-success text-white'
                        : 'border-border bg-background',
                    )}
                  >
                    {active ? <Check className="h-2.5 w-2.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground truncate">
                      {loc.name || id}
                    </span>
                    {!usable ? (
                      <span className="block text-[11px] text-muted-foreground">
                        No footer fields set
                      </span>
                    ) : active ? (
                      <span className="block text-[11px] text-success">Injected</span>
                    ) : (
                      <span className="block text-[11px] text-muted-foreground">
                        Click to inject
                      </span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {previewText ? (
          <div className="border-t border-border bg-muted/30 px-3 py-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <pre className="max-h-28 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
              {previewText}
            </pre>
          </div>
        ) : null}

        {injectedId ? (
          <div className="border-t border-border px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full text-destructive hover:text-destructive"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                removeFooter()
              }}
            >
              Remove footer from template
            </Button>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
