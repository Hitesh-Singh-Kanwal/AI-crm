'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, X, Plus, LayoutGrid, EyeOff } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

// Merge a saved layout (array of {id, visible} in display order) with the
// current widget registry: known widgets keep their saved order/visibility,
// and any widget added to the registry after the layout was last saved is
// appended as visible (so new widgets aren't silently hidden).
function mergeLayout(registry, saved) {
  const byId = new Map(registry.map((w) => [w.id, w]))
  const result = []
  const seen = new Set()

  for (const entry of saved || []) {
    if (byId.has(entry.id)) {
      result.push({ id: entry.id, visible: entry.visible !== false })
      seen.add(entry.id)
    }
  }
  for (const w of registry) {
    if (!seen.has(w.id)) {
      result.push({ id: w.id, visible: true })
    }
  }
  return result
}

// The grid has 12 base columns so 'quarter' (3 cols), 'third' (4 cols),
// 'half' (6 cols), and 'full' (12 cols) all compose cleanly — four 'quarter'
// widgets, three 'third' widgets, two 'half' widgets, or any mix can share a
// row. grid-auto-flow: dense (set on the container) lets a later, smaller
// widget slide up into a gap left by an earlier one instead of leaving empty
// space in the row; a widget with nothing beside it just sits alone in its
// own row.
const SPAN_CLASS = {
  quarter: 'md:col-span-3',
  third: 'md:col-span-4',
  half: 'md:col-span-6',
  full: 'md:col-span-12',
}

function SortableWidget({ id, title, size, editing, onRemove, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group relative col-span-1', SPAN_CLASS[size] || SPAN_CLASS.full)}
    >
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        {editing && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing rounded-md bg-background/90 p-1.5 text-muted-foreground shadow-sm hover:text-foreground touch-none"
            aria-label={`Drag to reorder ${title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          className="rounded-md bg-background/90 p-1.5 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label={`Hide ${title}`}
          title={`Hide ${title}`}
          onClick={() => onRemove(id)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={cn(editing && 'rounded-2xl ring-2 ring-brand/30 ring-offset-2 ring-offset-background')}>
        {children}
      </div>
    </div>
  )
}

/**
 * Generic drag-and-drop widget dashboard. `widgets` is the full registry
 * available on this page: [{ id, title, component: Component, size?, props? }].
 * `size` is 'quarter' | 'third' | 'half' | 'full' (default 'full') and
 * controls how much of the 12-column row the widget occupies —
 * matching-size widgets share a row automatically, and any widget with
 * nothing beside it gets its own row. Layout (order + visibility) is
 * per-user, persisted via /api/dashboard-layout.
 */
export default function DashboardBuilder({ page, widgets, sharedProps = {} }) {
  const [layout, setLayout] = useState(null) // [{id, visible}]
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)

  const registryById = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets])

  useEffect(() => {
    let active = true
    api.get(`/api/dashboard-layout?page=${page}`).then((res) => {
      if (!active) return
      const saved = res.success ? res.data : []
      setLayout(mergeLayout(widgets, saved))
      setLoading(false)
    })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function persist(nextLayout) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.put('/api/dashboard-layout', { page, widgets: nextLayout })
    }, 400)
  }

  function updateLayout(updater) {
    setLayout((prev) => {
      const next = updater(prev)
      persist(next)
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    updateLayout((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id)
      const newIndex = prev.findIndex((w) => w.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function removeWidget(id) {
    updateLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)))
  }

  function addWidget(id) {
    updateLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: true } : w)))
  }

  if (loading || !layout) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading dashboard…</div>
  }

  const visibleWidgets = layout.filter((w) => w.visible && registryById.has(w.id))
  const hiddenWidgets = layout.filter((w) => !w.visible && registryById.has(w.id))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        {hiddenWidgets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add widget ({hiddenWidgets.length} hidden)
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hiddenWidgets.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => addWidget(w.id)}>
                  <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {registryById.get(w.id)?.title || w.id}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant={editing ? 'gradient' : 'outline'} size="sm" onClick={() => setEditing((e) => !e)}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          {editing ? 'Done customizing' : 'Customize'}
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 [grid-auto-flow:dense]">
            {visibleWidgets.map((w) => {
              const entry = registryById.get(w.id)
              if (!entry) return null
              const WidgetComponent = entry.component
              return (
                <SortableWidget
                  key={w.id}
                  id={w.id}
                  title={entry.title}
                  size={entry.size || 'full'}
                  editing={editing}
                  onRemove={removeWidget}
                >
                  <WidgetComponent {...sharedProps} {...(entry.props || {})} />
                </SortableWidget>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {visibleWidgets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          All widgets are hidden. Use "Add widget" above to bring them back.
        </div>
      )}
    </div>
  )
}
