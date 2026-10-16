'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Layers,
  Loader2,
  MapPin,
  PanelBottom,
  Upload,
} from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import LoadingSpinner from '@/components/shared/LoadingSpinner'
import { useToast } from '@/components/ui/toast'
import api from '@/lib/api'
import { getEffectiveBranch } from '@/lib/auth'
import {
  getInjectedFooterLocationId,
  injectFooterIntoHtml,
  locationHasFooterContent,
} from '@/lib/email-footer'
import { cn } from '@/lib/utils'
import { extractCategoriesList } from '../emailBuilderApi'
import {
  EMAIL_BULK_MAX_FILES,
  EMAIL_IMPORT_ACCEPT,
  readEmailImportFolder,
} from '../emailFileImport'
import EmailPreviewFrame from './EmailPreviewFrame'
import EmailFooterPicker from './EmailFooterPicker'

function defaultStudioIds() {
  const branch = getEffectiveBranch()
  return branch ? [String(branch)] : []
}

function hasLocation(locationID) {
  return (
    locationID === ALL_BRANCHES_VALUE ||
    (Array.isArray(locationID) && locationID.length > 0)
  )
}

/**
 * Full-screen flow: create many email templates from a folder of .html / .txt files.
 * Steps: location + category + folder → preview one-by-one (with footer) → create.
 */
export default function EmailBulkCreateTab({ onBack, onCreated }) {
  const toast = useToast()
  const folderInputRef = useRef(null)
  const previewScrollRef = useRef(null)

  const [step, setStep] = useState('setup') // 'setup' | 'review'
  const [locationID, setLocationID] = useState(() => defaultStudioIds())
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [locations, setLocations] = useState([])
  const [folderName, setFolderName] = useState('')
  const [reading, setReading] = useState(false)
  const [items, setItems] = useState([])
  const [index, setIndex] = useState(0)
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [applyingFooterAll, setApplyingFooterAll] = useState(false)

  const reset = useCallback(() => {
    setStep('setup')
    setLocationID(defaultStudioIds())
    setCategoryId('')
    setFolderName('')
    setReading(false)
    setItems([])
    setIndex(0)
    setCreating(false)
    setProgress({ done: 0, total: 0 })
    setApplyingFooterAll(false)
    if (folderInputRef.current) folderInputRef.current.value = ''
  }, [])

  const handleBack = () => {
    if (creating) return
    reset()
    onBack?.()
  }

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const result = await api.get('/api/email/builder/category')
      if (result.success) setCategories(extractCategoriesList(result))
    } catch (e) {
      console.error(e)
    } finally {
      setCategoriesLoading(false)
    }
  }, [])

  const fetchLocations = useCallback(async () => {
    try {
      const res = await api.get('/api/location?limit=200')
      const raw = res?.data
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.locations)
          ? raw.locations
          : Array.isArray(raw?.data)
            ? raw.data
            : []
      if (res.success) setLocations(list)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchLocations()
  }, [fetchCategories, fetchLocations])

  const locationScopedCategories = useMemo(() => {
    if (!hasLocation(locationID)) return categories
    if (locationID === ALL_BRANCHES_VALUE) return categories
    return categories.filter((cat) => {
      if (cat.allLocations) return true
      const catLocs = (Array.isArray(cat.locationID)
        ? cat.locationID
        : cat.locationID
          ? [cat.locationID]
          : []
      ).map((l) => String(l?._id || l))
      return locationID.every((id) => catLocs.includes(String(id)))
    })
  }, [categories, locationID])

  useEffect(() => {
    if (!locationScopedCategories.length) {
      setCategoryId('')
      return
    }
    setCategoryId((prev) =>
      locationScopedCategories.some((c) => c._id === prev)
        ? prev
        : locationScopedCategories[0]._id,
    )
  }, [locationScopedCategories])

  const setupReady = hasLocation(locationID) && !!categoryId

  const onFolderChange = async (event) => {
    const list = event.target.files
    if (!list?.length) return
    if (!setupReady) {
      toast.error({
        title: 'Missing details',
        message: 'Select studio location and category before uploading a folder.',
      })
      event.target.value = ''
      return
    }

    const firstPath = String(list[0]?.webkitRelativePath || '')
    const folder = firstPath.includes('/') ? firstPath.split('/')[0] : 'Selected folder'
    setFolderName(folder)
    setReading(true)
    try {
      const next = await readEmailImportFolder(list)
      setItems(next)
      setIndex(0)
      setStep('review')
      const ok = next.filter((i) => !i.error).length
      const bad = next.length - ok
      toast.success({
        title: 'Folder loaded',
        message:
          bad > 0
            ? `${ok} template${ok === 1 ? '' : 's'} ready · ${bad} skipped`
            : `${ok} template${ok === 1 ? '' : 's'} ready to preview`,
      })
    } catch (err) {
      toast.error({ title: 'Upload failed', message: err?.message || 'Could not read the folder.' })
      event.target.value = ''
      setFolderName('')
    } finally {
      setReading(false)
    }
  }

  const current = items[index] || null
  const includedCount = items.filter(
    (i) => i.included && !i.error && String(i.html || '').trim(),
  ).length
  const readyCount = items.filter((i) => !i.error && String(i.html || '').trim()).length
  const currentFooterId = current ? getInjectedFooterLocationId(current.html) : null

  const updateCurrent = (patch) => {
    if (!current) return
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    // After footer inject, scroll preview so the new bar is visible right away.
    if (patch.html != null && getInjectedFooterLocationId(patch.html)) {
      requestAnimationFrame(() => {
        const el = previewScrollRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      })
      setTimeout(() => {
        const el = previewScrollRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }, 350)
    }
  }

  const goPrev = () => setIndex((i) => Math.max(0, i - 1))
  const goNext = () => setIndex((i) => Math.min(items.length - 1, i + 1))

  const applyFooterToAll = () => {
    const footerId = currentFooterId
    if (!footerId) {
      toast.error({
        title: 'No footer on this template',
        message: 'Inject a footer on the current preview first, then apply it to all.',
      })
      return
    }
    const loc = locations.find((l) => String(l._id) === String(footerId))
    if (!loc || !locationHasFooterContent(loc)) {
      toast.error({
        title: 'Footer unavailable',
        message: 'Could not find that studio footer. Try injecting again.',
      })
      return
    }

    setApplyingFooterAll(true)
    const nextItems = items.map((item) => {
      if (item.error || !item.included || !String(item.html || '').trim()) return item
      const nextHtml = injectFooterIntoHtml(item.html, loc)
      if (!getInjectedFooterLocationId(nextHtml)) return item
      return { ...item, html: nextHtml }
    })
    const updated = nextItems.filter(
      (item, i) => item.html !== items[i].html,
    ).length
    setItems(nextItems)
    setApplyingFooterAll(false)
    toast.success({
      title: 'Footer applied',
      message: `Studio footer added to ${updated} template${updated === 1 ? '' : 's'}.`,
    })
  }

  const createAll = async () => {
    const selected = items.filter(
      (i) =>
        i.included &&
        !i.error &&
        String(i.html || '').trim() &&
        String(i.subject || '').trim(),
    )
    if (!selected.length) {
      toast.error({
        title: 'Nothing to create',
        message: 'Include at least one template with a name and content.',
      })
      return
    }
    if (!setupReady) {
      toast.error({ title: 'Missing details', message: 'Studio and category are required.' })
      return
    }

    setCreating(true)
    setProgress({ done: 0, total: selected.length })
    const allLocations = locationID === ALL_BRANCHES_VALUE
    let created = 0
    const failures = []

    for (const item of selected) {
      try {
        const result = await api.post('/api/email/builder/', {
          categoryID: categoryId,
          subject: item.subject.trim(),
          body: null,
          htmlBody: item.html,
          allLocations,
          locationID: allLocations ? [] : locationID,
        })
        if (!result.success) {
          failures.push(`${item.subject}: ${result.error || 'failed'}`)
        } else {
          created += 1
        }
      } catch (e) {
        console.error(e)
        failures.push(`${item.subject}: network error`)
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }))
    }

    setCreating(false)

    if (created > 0) {
      toast.success({
        title: 'Templates created',
        message:
          failures.length > 0
            ? `Created ${created} of ${selected.length}. ${failures.length} failed.`
            : `Created ${created} email template${created === 1 ? '' : 's'}.`,
      })
      reset()
      onCreated?.({ created, failed: failures.length })
      return
    }

    toast.error({
      title: 'Create failed',
      message: failures[0] || 'Could not create any templates.',
    })
  }

  if (step === 'setup') {
    return (
      <TabsContent value="bulk" className="mt-4">
        <div className="flex items-center justify-center px-2 py-2 md:py-4">
          <div className="w-full max-w-3xl">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-0.5">
              <div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to templates
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                  Multiple templates · Step 1 of 2
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 mt-0.5">
                  Location, category & folder
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Then preview each file and create
              </p>
            </div>

            <Card className="border-slate-200/80 shadow-md overflow-hidden rounded-2xl">
              <CardContent className="p-4 md:p-6 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Studio location <span className="text-destructive">*</span>
                  </Label>
                  <LocationSelector
                    value={locationID}
                    onChange={setLocationID}
                    multiple
                    allowAllBranches
                    showAllOption={false}
                    placeholder="Select studio(s)…"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  {categoriesLoading ? (
                    <div className="py-3">
                      <LoadingSpinner size="sm" text="Loading categories…" />
                    </div>
                  ) : (
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30 h-10"
                    >
                      <option value="">Select a category…</option>
                      {locationScopedCategories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {!categoriesLoading && locationScopedCategories.length === 0 ? (
                    <p className="text-[11px] text-warning">
                      No categories for this studio. Create one under Manage categories first.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center space-y-3">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload folder</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Pick a folder of .html, .htm or .txt email files (up to {EMAIL_BULK_MAX_FILES}).
                      Nested folders are fine — only those types are used.
                    </p>
                  </div>
                  <input
                    ref={folderInputRef}
                    type="file"
                    accept={EMAIL_IMPORT_ACCEPT}
                    multiple
                    webkitdirectory=""
                    directory=""
                    onChange={onFolderChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="gradient"
                    disabled={!setupReady || reading}
                    onClick={() => folderInputRef.current?.click()}
                    className="mx-auto"
                  >
                    {reading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reading folder…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose folder
                      </>
                    )}
                  </Button>
                  {folderName ? (
                    <p className="text-[11px] text-muted-foreground">Selected: {folderName}</p>
                  ) : null}
                  {!setupReady ? (
                    <p className="text-[11px] text-muted-foreground">
                      Select location and category to enable folder upload.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="bulk" className="mt-3 flex-1 min-h-0 flex flex-col">
      <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-148px)]">
        <Card className="flex flex-col flex-1 min-h-0 border-border/80 shadow-sm overflow-hidden">
          <div className="flex-shrink-0 border-b py-2 px-3 bg-card">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={creating}
                className="h-8 shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand inline-flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Preview & create
                </p>
                <p className="text-sm font-medium text-foreground truncate">
                  {folderName || 'Folder'} · {includedCount} of {readyCount} included
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={index <= 0 || creating}
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs tabular-nums text-muted-foreground px-1 min-w-[3.5rem] text-center">
                  {items.length ? index + 1 : 0}/{items.length}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={index >= items.length - 1 || creating}
                  onClick={goNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {current && !current.error ? (
                <>
                  <EmailFooterPicker
                    html={current.html || ''}
                    onHtmlChange={(next) => updateCurrent({ html: next })}
                    className="shrink-0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 hidden md:inline-flex"
                    disabled={!currentFooterId || creating || applyingFooterAll || includedCount === 0}
                    onClick={applyFooterToAll}
                    title="Apply the footer from this preview to every included template"
                  >
                    <PanelBottom className="h-3.5 w-3.5 mr-1.5" />
                    Apply footer to all
                  </Button>
                </>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                disabled={creating}
                onClick={() => {
                  setStep('setup')
                  setItems([])
                  setFolderName('')
                  if (folderInputRef.current) folderInputRef.current.value = ''
                }}
              >
                Change folder
              </Button>

              <Button
                type="button"
                variant="gradient"
                size="sm"
                className="h-8"
                onClick={createAll}
                disabled={creating || includedCount === 0}
              >
                {creating ? (
                  <>Creating {progress.done}/{progress.total}…</>
                ) : (
                  <>
                    Create {includedCount}
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] min-h-0 flex-1 overflow-hidden">
            <aside className="border-b lg:border-b-0 lg:border-r border-border overflow-y-auto max-h-44 lg:max-h-none bg-muted/20">
              <ul className="p-2 space-y-0.5">
                {items.map((item, i) => {
                  const bad = !!item.error || !String(item.html || '').trim()
                  const hasFooter = !!getInjectedFooterLocationId(item.html)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={creating}
                        onClick={() => setIndex(i)}
                        className={cn(
                          'w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors',
                          i === index
                            ? 'bg-brand/10 text-foreground ring-1 ring-brand/30'
                            : 'hover:bg-muted/60 text-muted-foreground',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0',
                              item.included && !bad
                                ? 'bg-success/15 border-success/40 text-success'
                                : 'border-border bg-muted/40',
                            )}
                          >
                            {item.included && !bad ? <Check className="h-2.5 w-2.5" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium truncate text-foreground">
                              {item.subject || item.fileName}
                            </span>
                            <span className="block truncate text-[10px] opacity-70">
                              {bad
                                ? item.error || 'Empty'
                                : hasFooter
                                  ? `${item.fileName} · footer`
                                  : item.fileName}
                            </span>
                          </span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </aside>

            <div
              ref={previewScrollRef}
              className="min-h-0 overflow-y-auto p-3 md:p-4 space-y-3 bg-slate-50/40"
            >
              {current ? (
                <>
                  <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <Label className="text-xs">Template name</Label>
                      <Input
                        value={current.subject}
                        disabled={creating || !!current.error}
                        onChange={(e) => updateCurrent({ subject: e.target.value })}
                        placeholder="Template name"
                        className="h-9"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground pb-1.5 shrink-0">
                      <input
                        type="checkbox"
                        className="rounded border-input"
                        checked={!!current.included && !current.error}
                        disabled={
                          creating || !!current.error || !String(current.html || '').trim()
                        }
                        onChange={(e) => updateCurrent({ included: e.target.checked })}
                      />
                      Include when creating
                    </label>
                    {current && !current.error ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 md:hidden"
                        disabled={
                          !currentFooterId || creating || applyingFooterAll || includedCount === 0
                        }
                        onClick={applyFooterToAll}
                      >
                        <PanelBottom className="h-3.5 w-3.5 mr-1.5" />
                        Footer → all
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate px-0.5">
                    File: {current.path || current.fileName}
                    {current.kind
                      ? ` · ${current.kind === 'html' ? 'HTML' : 'Text → HTML'}`
                      : ''}
                    {currentFooterId ? ' · footer injected' : ''}
                  </p>
                  {current.error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
                      {current.error}
                    </div>
                  ) : (
                    <EmailPreviewFrame
                      html={current.html}
                      subject={current.subject}
                      fullWidth
                      desktopMaxHeight={8000}
                      className="min-h-[calc(100vh-320px)]"
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-10 text-center">No files loaded.</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </TabsContent>
  )
}
