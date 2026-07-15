'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Lock, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PALETTE_CATEGORIES } from '@/components/workflow/builder/constants'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import {
  getPaletteUnlockMessage,
  getWorkflowStepProgress,
  isPaletteCategoryUnlocked,
} from '@/lib/workflow-contact'
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
  const nodes = useWorkflowBuilderStore((s) => s.nodes)
  const actionsUnlocked = useWorkflowBuilderStore((s) => s.actionsUnlocked)
  const exitUnlocked = useWorkflowBuilderStore((s) => s.exitUnlocked)
  const guidedCategory = useWorkflowBuilderStore((s) => s.guidedCategory)
  const setGuidedCategory = useWorkflowBuilderStore((s) => s.setGuidedCategory)
  const activeCategory = guidedCategory || 'all'
  const setActiveCategory = (id) => setGuidedCategory(id)
  const sidebarCollapsed = useWorkflowBuilderStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useWorkflowBuilderStore((s) => s.setSidebarCollapsed)
  const addNodeToFlow = useWorkflowBuilderStore((s) => s.addNodeToFlow)

  const progress = useMemo(
    () => getWorkflowStepProgress(nodes, { actionsUnlocked, exitUnlocked }),
    [actionsUnlocked, exitUnlocked, nodes]
  )

  const onDragStart = (event, item, categoryId) => {
    if (!isPaletteCategoryUnlocked(categoryId, progress)) {
      event.preventDefault()
      toast.error(getPaletteUnlockMessage(categoryId, progress))
      return
    }
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
      unlocked: isPaletteCategoryUnlocked(category.id, progress),
      lockMessage: getPaletteUnlockMessage(category.id, progress),
      items: category.items.filter((item) => {
        const matchesCategory = activeCategory === 'all' || category.id === activeCategory
        const matchesQuery =
          !q ||
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
        return matchesCategory && matchesQuery
      }),
    })).filter((category) => category.items.length > 0)
  }, [activeCategory, progress, query])

  const handleAdd = (item, categoryId) => {
    if (!isPaletteCategoryUnlocked(categoryId, progress)) {
      toast.error(getPaletteUnlockMessage(categoryId, progress))
      return
    }
    const result = addNodeToFlow(item.type)
    if (result && result.ok === false) {
      toast.error(result.error || 'Cannot add this step yet.')
    }
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
            <p className="text-[11px] text-muted-foreground">Unlock steps in order, then browse freely</p>
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
            ].map((tab) => {
              const unlocked = tab.id === 'all' || isPaletteCategoryUnlocked(tab.id, progress)
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    activeCategory === tab.id
                      ? 'bg-[var(--studio-primary)] text-white'
                      : 'bg-white text-muted-foreground hover:bg-slate-100 dark:bg-background dark:hover:bg-muted'
                  )}
                >
                  {tab.id !== 'all' && !unlocked ? <Lock className="h-3 w-3" /> : null}
                  {tab.label}
                </button>
              )
            })}
          </div>
          {!progress.unlocked.actions ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Finish Contact to unlock Action.
            </p>
          ) : !progress.unlocked.exit ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Add Email, SMS, or AI Call to unlock Exit logic.
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              All steps unlocked — switch tabs anytime.
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2 py-2">
            {PALETTE_CATEGORIES.flatMap((cat) => {
              const unlocked = isPaletteCategoryUnlocked(cat.id, progress)
              return cat.items.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.type}
                    type="button"
                    draggable={unlocked}
                    onDragStart={(e) => onDragStart(e, item, cat.id)}
                    onClick={() => handleAdd(item, cat.id)}
                    title={unlocked ? item.label : getPaletteUnlockMessage(cat.id, progress)}
                    className={cn(
                      'relative flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm',
                      unlocked
                        ? 'border-slate-200 bg-white text-muted-foreground hover:border-primary/40 hover:text-primary dark:border-border dark:bg-background'
                        : 'cursor-not-allowed border-slate-200/70 bg-white/60 text-muted-foreground/40 dark:border-border/50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {!unlocked ? (
                      <Lock className="absolute -right-0.5 -top-0.5 h-3 w-3 text-muted-foreground" />
                    ) : null}
                  </button>
                )
              })
            })}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredCategories.map((category) => (
              <div key={category.id} className={cn(!category.unlocked && 'opacity-70')}>
                <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {!category.unlocked ? <Lock className="h-3 w-3" /> : null}
                  {category.label}
                </h3>
                {!category.unlocked && category.lockMessage ? (
                  <p className="mb-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                    {category.lockMessage}
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  {category.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <div
                        key={item.type}
                        draggable={category.unlocked}
                        onDragStart={(e) => onDragStart(e, item, category.id)}
                        className={cn(
                          'group flex items-center gap-2 rounded-xl border p-2.5 shadow-sm transition-all dark:bg-card',
                          category.unlocked
                            ? 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md dark:border-border'
                            : 'cursor-not-allowed border-slate-200/70 bg-white/70 dark:border-border/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            category.unlocked
                              ? 'bg-slate-100 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary dark:bg-muted'
                              : 'bg-slate-100/70 text-slate-400 dark:bg-muted/50'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAdd(item, category.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="text-[13px] font-semibold text-foreground">{item.label}</div>
                          <div className="line-clamp-1 text-[11px] text-muted-foreground">
                            {item.description}
                          </div>
                        </button>
                        {category.unlocked ? (
                          <button
                            type="button"
                            onClick={() => handleAdd(item, category.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-muted-foreground opacity-0 transition-opacity hover:border-primary/30 hover:bg-primary/5 hover:text-primary group-hover:opacity-100 dark:border-border"
                            title={`Add ${item.label}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <p className="px-2 py-6 text-center text-[12px] text-muted-foreground">
                No steps match your search.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
