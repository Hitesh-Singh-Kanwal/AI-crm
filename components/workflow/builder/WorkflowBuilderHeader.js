'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Loader2,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Switch from '@/components/ui/switch'

export default function WorkflowBuilderHeader() {
  const workflowName = useWorkflowBuilderStore((s) => s.workflowName)
  const setWorkflowName = useWorkflowBuilderStore((s) => s.setWorkflowName)
  const zoom = useWorkflowBuilderStore((s) => s.zoom)
  const saveStatus = useWorkflowBuilderStore((s) => s.saveStatus)
  const isPublished = useWorkflowBuilderStore((s) => s.isPublished)
  const isActive = useWorkflowBuilderStore((s) => s.isActive)
  const setIsActive = useWorkflowBuilderStore((s) => s.setIsActive)
  const past = useWorkflowBuilderStore((s) => s.past)
  const future = useWorkflowBuilderStore((s) => s.future)
  const undo = useWorkflowBuilderStore((s) => s.undo)
  const redo = useWorkflowBuilderStore((s) => s.redo)
  const saveWorkflow = useWorkflowBuilderStore((s) => s.saveWorkflow)
  const publishWorkflow = useWorkflowBuilderStore((s) => s.publishWorkflow)
  const resetToDemo = useWorkflowBuilderStore((s) => s.resetToDemo)

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white px-4 py-2.5 dark:border-border dark:bg-card">
        <Link
          href="/ai-automation/workflows"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-muted-foreground hover:bg-slate-50 hover:text-foreground dark:border-border dark:hover:bg-muted"
          title="Back to workflows"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-10 max-w-lg border-transparent bg-transparent px-0 text-[16px] font-bold shadow-none focus-visible:border-border focus-visible:bg-background focus-visible:px-3"
            placeholder="Automation name"
          />
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-border dark:bg-muted/30 sm:flex">
          <span className={cn('text-[12px] font-semibold', isActive ? 'text-emerald-600' : 'text-muted-foreground')}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="hidden items-center gap-0.5 md:flex">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={undo} disabled={past.length === 0} title="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={redo} disabled={future.length === 0} title="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <span className="ml-1 min-w-[44px] text-center text-[11px] font-medium text-muted-foreground">{zoom}%</span>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="hidden items-center gap-1 text-[11px] text-emerald-600 sm:inline-flex">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="hidden text-[11px] text-amber-600 sm:inline">Unsaved changes</span>
          )}
          {isPublished && (
            <span className="hidden rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 sm:inline dark:bg-emerald-500/15 dark:text-emerald-300">
              Live
            </span>
          )}

          <Button type="button" variant="outline" size="sm" className="hidden h-9 gap-1.5 sm:inline-flex" onClick={resetToDemo} title="Reset demo">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>

          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={saveWorkflow} disabled={saveStatus === 'saving'}>
            {saveStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Save</span>
          </Button>

          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 bg-[var(--studio-primary)] text-white hover:brightness-95"
            onClick={publishWorkflow}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publish
        </Button>
      </div>
    </header>
  )
}
