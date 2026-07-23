'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GripVertical,
  X,
  Plus,
  LayoutGrid,
  RotateCcw,
  Check,
  Columns2,
  Columns3,
  Square,
  RectangleHorizontal,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { SIZE_OPTIONS } from '@/components/dashboard/widgets/shared'
import { LEGACY_WIDGET_MAP } from '@/components/dashboard/widgets/legacyWidgetMap'
import { useDashboardLayout } from '@/lib/hooks/useAnalyticsOverview'
import { useSWRConfig } from 'swr'
import { getEffectiveBranch } from '@/lib/auth'

const SPAN_CLASS = {
  quarter: 'md:col-span-3',
  third: 'md:col-span-4',
  half: 'md:col-span-6',
  full: 'md:col-span-12',
}

const SIZE_ICONS = {
  quarter: Square,
  third: Columns3,
  half: Columns2,
  full: RectangleHorizontal,
}

function defaultLayout(registry) {
  return registry.map((w) => ({
    id: w.id,
    visible: true,
    size: w.defaultSize || 'full',
  }))
}

function migrateLegacy(saved, registry) {
  if (!Array.isArray(saved) || saved.length === 0) return null

  const registryIds = new Set(registry.map((w) => w.id))
  const hasLegacy = saved.some((e) => LEGACY_WIDGET_MAP[e.id])
  const hasOnlyUnknown = saved.every((e) => !registryIds.has(e.id) && !LEGACY_WIDGET_MAP[e.id])
  if (!hasLegacy && !hasOnlyUnknown) return null

  const result = []
  const seen = new Set()
  for (const entry of saved) {
    const mapped = LEGACY_WIDGET_MAP[entry.id]
    if (mapped) {
      for (const id of mapped) {
        if (registryIds.has(id) && !seen.has(id)) {
          const def = registry.find((w) => w.id === id)
          result.push({
            id,
            visible: entry.visible !== false,
            size: def?.defaultSize || 'half',
          })
          seen.add(id)
        }
      }
    } else if (registryIds.has(entry.id) && !seen.has(entry.id)) {
      const def = registry.find((w) => w.id === entry.id)
      result.push({
        id: entry.id,
        visible: entry.visible !== false,
        size: entry.size || def?.defaultSize || 'full',
      })
      seen.add(entry.id)
    }
  }
  for (const w of registry) {
    if (!seen.has(w.id)) {
      result.push({ id: w.id, visible: true, size: w.defaultSize || 'full' })
    }
  }
  return result
}

function mergeLayout(registry, saved) {
  const migrated = migrateLegacy(saved, registry)
  if (migrated) return migrated

  const byId = new Map(registry.map((w) => [w.id, w]))
  const result = []
  const seen = new Set()

  for (const entry of saved || []) {
    const def = byId.get(entry.id)
    if (!def) continue
    const allowed = def.allowedSizes || ['quarter', 'third', 'half', 'full']
    const size = allowed.includes(entry.size) ? entry.size : def.defaultSize || 'full'
    result.push({ id: entry.id, visible: entry.visible !== false, size })
    seen.add(entry.id)
  }
  for (const w of registry) {
    if (!seen.has(w.id)) {
      result.push({ id: w.id, visible: true, size: w.defaultSize || 'full' })
    }
  }
  return result
}

function SortableWidget({
  id,
  title,
  size,
  allowedSizes,
  editing,
  onRemove,
  onResize,
  children,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 40 : 'auto',
    opacity: isDragging ? 0.35 : 1,
  }

  const sizes = (allowedSizes || SIZE_OPTIONS.map((s) => s.id)).filter((s) =>
    SIZE_OPTIONS.some((o) => o.id === s)
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative col-span-1 min-h-0', SPAN_CLASS[size] || SPAN_CLASS.full)}
    >
      {editing && (
        <div className="absolute inset-x-0 -top-px z-20 flex items-center justify-between gap-2 rounded-t-2xl border border-b-0 border-[var(--studio-primary)]/25 bg-background/95 px-2 py-1.5 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
              aria-label={`Drag ${title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {sizes.map((s) => {
              const opt = SIZE_OPTIONS.find((o) => o.id === s)
              const Icon = SIZE_ICONS[s] || Square
              return (
                <button
                  key={s}
                  type="button"
                  title={opt?.title || s}
                  onClick={() => onResize(id, s)}
                  className={cn(
                    'rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors',
                    size === s
                      ? 'bg-[var(--studio-primary)] text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="sr-only">{opt?.title}</span>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}
            <button
              type="button"
              className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${title}`}
              title="Remove"
              onClick={() => onRemove(id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          'h-full',
          editing && 'rounded-2xl pt-9 ring-1 ring-[var(--studio-primary)]/20 ring-offset-2 ring-offset-background'
        )}
      >
        {children}
      </div>
    </div>
  )
}

function WidgetCatalog({ open, onClose, hiddenWidgets, registryById, onAdd }) {
  const categories = useMemo(() => {
    const map = new Map()
    for (const w of hiddenWidgets) {
      const entry = registryById.get(w.id)
      if (!entry) continue
      const cat = entry.category || 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(entry)
    }
    return [...map.entries()]
  }, [hiddenWidgets, registryById])

  return (
    <Sheet open={open} onClose={onClose} side="right" width="420px">
      <SheetContent onClose={onClose} className="p-0">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-base">Add widgets</SheetTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose sections to show on your dashboard. Drag and resize after adding.
          </p>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {categories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              All widgets are already on your dashboard.
            </p>
          ) : (
            <div className="space-y-6">
              {categories.map(([category, items]) => (
                <div key={category}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-primary)]">
                    {category}
                  </p>
                  <div className="space-y-2">
                    {items.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onAdd(entry.id)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-[var(--studio-primary)]/40 hover:bg-muted/40"
                      >
                        <span
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: 'color-mix(in srgb, var(--studio-primary) 12%, transparent)' }}
                        >
                          <Plus className="h-4 w-4 text-[var(--studio-primary)]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">{entry.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{entry.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * CRM-style customizable dashboard: reorder (drag), resize, add, remove.
 * Layout is persisted per user via /api/dashboard-layout.
 * `toolbarExtra` renders on the same compact row as Customize (e.g. date range).
 */
export default function DashboardBuilder({
  page,
  widgets,
  sharedProps = {},
  dataLoading = false,
  toolbarExtra = null,
}) {
  const { mutate: globalMutate } = useSWRConfig()
  const branch = typeof window !== 'undefined' ? getEffectiveBranch() || 'all' : 'all'
  const layoutKey = ['dashboard-layout', page, branch]
  const { data: savedLayout, isLoading: layoutLoading } = useDashboardLayout(page)

  const [layout, setLayout] = useState(null)
  const [editing, setEditing] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [activeId, setActiveId] = useState(null)
  const saveTimer = useRef(null)
  const savedHintTimer = useRef(null)
  const didMigratePersist = useRef(false)

  const registryById = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets])

  // Hydrate local layout from SWR cache / network once available.
  useEffect(() => {
    if (layoutLoading) return
    const saved = Array.isArray(savedLayout) ? savedLayout : []
    const next = mergeLayout(widgets, saved)
    setLayout(next)

    const savedIds = new Set(saved.map((w) => w.id))
    const needsPersist =
      (saved || []).some((w) => LEGACY_WIDGET_MAP[w.id]) ||
      next.some((w) => !savedIds.has(w.id) && registryById.has(w.id))

    if (needsPersist && next.length && !didMigratePersist.current) {
      didMigratePersist.current = true
      api.put('/api/dashboard-layout', { page, widgets: next }).then((res) => {
        if (res.success) globalMutate(layoutKey, next, { revalidate: false })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, layoutLoading, savedLayout, widgets])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (savedHintTimer.current) clearTimeout(savedHintTimer.current)
    }
  }, [])

  function persist(nextLayout) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(() => {
      api.put('/api/dashboard-layout', { page, widgets: nextLayout }).then((res) => {
        if (res.success) {
          globalMutate(layoutKey, nextLayout, { revalidate: false })
          setSaveState('saved')
          if (savedHintTimer.current) clearTimeout(savedHintTimer.current)
          savedHintTimer.current = setTimeout(() => setSaveState('idle'), 1600)
        } else {
          setSaveState('idle')
        }
      })
    }, 350)
  }

  function updateLayout(updater) {
    setLayout((prev) => {
      if (!prev) return prev
      const next = typeof updater === 'function' ? updater(prev) : updater
      persist(next)
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    updateLayout((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id)
      const newIndex = prev.findIndex((w) => w.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function removeWidget(id) {
    updateLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)))
  }

  function addWidget(id) {
    updateLayout((prev) => {
      const def = registryById.get(id)
      const next = prev.map((w) =>
        w.id === id ? { ...w, visible: true, size: w.size || def?.defaultSize || 'half' } : w
      )
      const idx = next.findIndex((w) => w.id === id)
      if (idx >= 0) {
        const [item] = next.splice(idx, 1)
        next.push(item)
      }
      return next
    })
    setCatalogOpen(false)
  }

  function resizeWidget(id, size) {
    updateLayout((prev) => prev.map((w) => (w.id === id ? { ...w, size } : w)))
  }

  function resetLayout() {
    const next = defaultLayout(widgets)
    setLayout(next)
    persist(next)
  }

  // One skeleton shape for the whole loading period (saved layout + widget
  // data), not two different ones in sequence — swapping a 4-box generic
  // skeleton for a differently-sized N-box one mid-load (plus the toolbar
  // popping in between them) read as a flash/blink even though each phase
  // was "just loading" on its own.
  if (layoutLoading || !layout || dataLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-48 animate-pulse rounded-[20px] border-2 border-border bg-muted/40',
              i === 1 ? 'md:col-span-12' : 'md:col-span-4'
            )}
          />
        ))}
      </div>
    )
  }

  const visibleWidgets = layout.filter((w) => w.visible && registryById.has(w.id))
  const hiddenWidgets = layout.filter((w) => !w.visible && registryById.has(w.id))
  const activeEntry = activeId ? registryById.get(activeId) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing && (
          <span className="mr-auto text-[11px] text-muted-foreground">
            Drag · resize · remove
            {saveState === 'saving' && <span className="ml-1.5">· Saving…</span>}
            {saveState === 'saved' && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-600">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}
          </span>
        )}

        {toolbarExtra}

        <div className="flex items-center gap-1.5">
          {(editing || hiddenWidgets.length > 0) && (
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-[13px]" onClick={() => setCatalogOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
              {hiddenWidgets.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  {hiddenWidgets.length}
                </span>
              )}
            </Button>
          )}
          {editing && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-[13px]"
              onClick={resetLayout}
              title="Reset to default layout"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant={editing ? 'gradient' : 'outline'}
            size="sm"
            className="h-8 px-2.5 text-[13px]"
            onClick={() => setEditing((e) => !e)}
          >
            <LayoutGrid className="mr-1 h-3.5 w-3.5" />
            {editing ? 'Done' : 'Customize'}
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12 [grid-auto-flow:dense]">
            {visibleWidgets.map((w) => {
              const entry = registryById.get(w.id)
              if (!entry) return null
              const WidgetComponent = entry.component
              return (
                <SortableWidget
                  key={w.id}
                  id={w.id}
                  title={entry.title}
                  size={w.size || entry.defaultSize || 'full'}
                  allowedSizes={entry.allowedSizes}
                  editing={editing}
                  onRemove={removeWidget}
                  onResize={resizeWidget}
                >
                  <WidgetComponent {...sharedProps} {...(entry.props || {})} />
                </SortableWidget>
              )
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeEntry ? (
            <div className="rounded-2xl border-2 border-[var(--studio-primary)] bg-card/95 px-4 py-3 shadow-xl backdrop-blur-sm">
              <p className="text-sm font-semibold text-foreground">{activeEntry.title}</p>
              <p className="text-xs text-muted-foreground">Drop to reposition</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {visibleWidgets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">Your dashboard is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Add widgets to build your view.</p>
          <Button variant="gradient" size="sm" className="mt-4" onClick={() => setCatalogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add widget
          </Button>
        </div>
      )}

      <WidgetCatalog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        hiddenWidgets={hiddenWidgets}
        registryById={registryById}
        onAdd={addWidget}
      />
    </div>
  )
}
