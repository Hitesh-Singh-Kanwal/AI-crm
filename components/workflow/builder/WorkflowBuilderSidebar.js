'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PALETTE_CATEGORIES } from '@/components/workflow/builder/constants'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const DRAG_TYPE = 'application/workflow-builder-node'

export function getDragPayload(event) {
  try {
    const raw = event.dataTransfer.getData(DRAG_TYPE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function WorkflowBuilderSidebar() {
  const [query, setQuery] = useState('')
  const guidedCategory = useWorkflowBuilderStore((s) => s.guidedCategory)
  const setGuidedCategory = useWorkflowBuilderStore((s) => s.setGuidedCategory)
  const activeCategory = guidedCategory || 'all'
  const setActiveCategory = (id) => setGuidedCategory(id)
  const sidebarCollapsed = useWorkflowBuilderStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useWorkflowBuilderStore((s) => s.setSidebarCollapsed)
  const addNodeToFlow = useWorkflowBuilderStore((s) => s.addNodeToFlow)

  const onDragStart = (event, item) => {
    event.dataTransfer.setData(
      DRAG_TYPE,
      JSON.stringify({
        paletteType: item.type,
        category: item.category,
        label: item.label,
      })
    )
    event.dataTransfer.effectAllowed = 'move'
  }

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PALETTE_CATEGORIES.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const matchesCategory = activeCategory === 'all' || category.id === activeCategory
        const matchesQuery =
          !q ||
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
        return matchesCategory && matchesQuery
      }),
    })).filter((category) => category.items.length > 0)
  }, [activeCategory, query])

  const handleAdd = (item) => {
    addNodeToFlow(item.type)
  }

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col border-r border-slate-200/80 bg-slate-50/80 transition-all duration-200 dark:border-border dark:bg-muted/20',
        sidebarCollapsed ? 'w-14' : 'w-[280px]'
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-3 dark:border-border">
        {!sidebarCollapsed && (
          <div>
            <h2 className="text-[14px] font-bold text-foreground">Add a step</h2>
            <p className="text-[11px] text-muted-foreground">Click or drag to the canvas</p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!sidebarCollapsed && (
        <div className="space-y-3 border-b border-slate-200/80 p-3 dark:border-border">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search steps…"
              className="h-9 border-slate-200 bg-white pl-9 text-[13px] dark:border-border dark:bg-background"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'All' },
              ...PALETTE_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  activeCategory === tab.id
                    ? 'bg-[var(--studio-primary)] text-white'
                    : 'bg-white text-muted-foreground hover:bg-slate-100 dark:bg-background dark:hover:bg-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2 py-2">
            {PALETTE_CATEGORIES.flatMap((cat) =>
              cat.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.type}
                    type="button"
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    onClick={() => handleAdd(item)}
                    title={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-muted-foreground shadow-sm hover:border-primary/40 hover:text-primary dark:border-border dark:bg-background"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredCategories.map((category) => (
              <div key={category.id}>
                <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {category.label}
                </h3>
                <div className="space-y-1.5">
                  {category.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, item)}
                        className="group flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-border dark:bg-card"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary dark:bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(item)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="text-[13px] font-semibold text-foreground">{item.label}</div>
                          <div className="line-clamp-1 text-[11px] text-muted-foreground">{item.description}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdd(item)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-muted-foreground opacity-0 transition-opacity hover:border-primary/30 hover:bg-primary/5 hover:text-primary group-hover:opacity-100 dark:border-border"
                          title={`Add ${item.label}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">No steps match your search.</p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
