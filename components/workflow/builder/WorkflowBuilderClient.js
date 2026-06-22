'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useWorkflowOptions } from '@/lib/useWorkflowOptions'
import WorkflowBuilderCanvas from '@/components/workflow/builder/WorkflowBuilderCanvas'
import WorkflowBuilderHeader from '@/components/workflow/builder/WorkflowBuilderHeader'
import WorkflowBuilderPropertiesPanel from '@/components/workflow/builder/WorkflowBuilderPropertiesPanel'
import WorkflowBuilderSidebar from '@/components/workflow/builder/WorkflowBuilderSidebar'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import {
  graphToWorkflowPayload,
  workflowToGraph,
} from '@/components/workflow/builder/workflowGraphAdapter'

function getIdFromUrl() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('id')
}

export default function WorkflowBuilderClient() {
  const setOptions = useWorkflowBuilderStore((s) => s.setOptions)
  const loadWorkflowGraph = useWorkflowBuilderStore((s) => s.loadWorkflowGraph)
  const setSaveStatus = useWorkflowBuilderStore((s) => s.setSaveStatus)
  const setWorkflowId = useWorkflowBuilderStore((s) => s.setWorkflowId)
  const setIsActive = useWorkflowBuilderStore((s) => s.setIsActive)
  const workflowId = useWorkflowBuilderStore((s) => s.workflowId)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const { forms, reasons } = useWorkflowOptions(true)

  useEffect(() => {
    setOptions({ forms, reasons })
  }, [forms, reasons, setOptions])

  // Load an existing workflow when ?id= is present.
  useEffect(() => {
    const id = getIdFromUrl()
    if (!id) return

    let cancelled = false
    setLoading(true)
    setLoadError('')
    api.get(`/api/workflow/${id}`).then((res) => {
      if (cancelled) return
      if (res?.success && res.data) {
        const graph = workflowToGraph(res.data)
        loadWorkflowGraph(graph)
      } else {
        setLoadError(res?.error || 'Failed to load workflow.')
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadWorkflowGraph])

  const persist = useCallback(
    async ({ publish = false }) => {
      const state = useWorkflowBuilderStore.getState()
      const isActive = publish ? true : state.isActive

      const { ok, payload, warnings, error } = graphToWorkflowPayload({
        workflowName: state.workflowName,
        nodes: state.nodes,
        edges: state.edges,
        isActive,
      })

      if (!ok) {
        toast.error(error)
        return
      }

      setSaving(true)
      setSaveStatus('saving')

      const existingId = state.workflowId
      const res = existingId
        ? await api.patch(`/api/workflow/${existingId}`, payload)
        : await api.post('/api/workflow/', payload)

      setSaving(false)

      if (res?.success) {
        const saved = res.data
        const newId = saved?._id || saved?.id || existingId
        if (newId && newId !== existingId) {
          setWorkflowId(newId)
          const url = new URL(window.location.href)
          url.searchParams.set('id', newId)
          window.history.replaceState({}, '', url)
        }
        if (publish) setIsActive(true)
        setSaveStatus('saved')
        ;(warnings || []).forEach((w) => toast.warning(w))
        toast.success(publish ? 'Workflow published' : existingId ? 'Workflow updated' : 'Workflow created')
      } else {
        setSaveStatus('unsaved')
        toast.error(res?.error || 'Failed to save workflow.')
      }
    },
    [setIsActive, setSaveStatus, setWorkflowId]
  )

  const handleSave = useCallback(() => persist({ publish: false }), [persist])
  const handlePublish = useCallback(() => persist({ publish: true }), [persist])

  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-border dark:bg-background md:h-[calc(100vh-6rem)]">
      <WorkflowBuilderHeader onSave={handleSave} onPublish={handlePublish} saving={saving} />

      {loadError && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-[12px] text-destructive">
          {loadError}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-background/60">
            <span className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading workflow…
            </span>
          </div>
        )}
        <WorkflowBuilderSidebar />
        <WorkflowBuilderCanvas />
        <WorkflowBuilderPropertiesPanel />
      </div>
    </div>
  )
}
