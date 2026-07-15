'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { useWorkflowOptions } from '@/lib/useWorkflowOptions'
import { extractDynamicListsList } from '@/lib/dynamic-list-normalize'
import { hydrateContactGroupsFromAudience } from '@/lib/workflow-contact'
import WorkflowBuilderCanvas from '@/components/workflow/builder/WorkflowBuilderCanvas'
import WorkflowBuilderHeader from '@/components/workflow/builder/WorkflowBuilderHeader'
import WorkflowBuilderPropertiesPanel from '@/components/workflow/builder/WorkflowBuilderPropertiesPanel'
import WorkflowBuilderSidebar from '@/components/workflow/builder/WorkflowBuilderSidebar'
import WorkflowStepGuide from '@/components/workflow/builder/WorkflowStepGuide'
import { useWorkflowBuilderStore } from '@/components/workflow/builder/workflowBuilderStore'
import {
  graphToWorkflowPayload,
  workflowToGraph,
} from '@/components/workflow/builder/workflowGraphAdapter'
import { createBlankWorkflow } from '@/components/workflow/builder/mockWorkflowData'

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
  const guidedCategory = useWorkflowBuilderStore((s) => s.guidedCategory)
  const setGuidedCategory = useWorkflowBuilderStore((s) => s.setGuidedCategory)
  const nodes = useWorkflowBuilderStore((s) => s.nodes)
  const syncWorkflowUnlocks = useWorkflowBuilderStore((s) => s.syncWorkflowUnlocks)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [dynamicLists, setDynamicLists] = useState([])
  const { forms, reasons } = useWorkflowOptions(true)

  useEffect(() => {
    setOptions({ forms, reasons, dynamicLists })
  }, [forms, reasons, dynamicLists, setOptions])

  // Sync unlock latches when Contact / Action become complete — never force tab changes.
  useEffect(() => {
    syncWorkflowUnlocks()
  }, [nodes, syncWorkflowUnlocks])

  useEffect(() => {
    let cancelled = false
    api.get('/api/dynamic-list?status=active&limit=200').then((res) => {
      if (cancelled) return
      if (res?.success) {
        setDynamicLists(extractDynamicListsList(res))
      } else {
        setDynamicLists([])
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Load an existing workflow when ?id= is present; otherwise start blank.
  useEffect(() => {
    const id = getIdFromUrl()
    if (!id) {
      const blank = createBlankWorkflow()
      loadWorkflowGraph({
        workflowId: null,
        workflowName: blank.workflowName,
        nodes: blank.nodes,
        edges: blank.edges,
        isActive: true,
      })
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError('')
    api.get(`/api/workflow/${id}`).then(async (res) => {
      if (cancelled) return
      if (res?.success && res.data) {
        const graph = workflowToGraph(res.data)
        const trigger = graph.nodes?.find((n) => n.data?.category === 'trigger')
        const listId =
          res.data?.listID?._id ||
          res.data?.listID ||
          trigger?.data?.config?.listID
        const audienceMode =
          res.data?.audienceMode ||
          trigger?.data?.config?.audienceMode ||
          (listId ? 'list' : res.data?.baseCondition ? 'all' : '')

        if (trigger && (audienceMode === 'list' || audienceMode === 'all')) {
          let listConditionSource = null
          let listName = trigger.data.config.listName || ''
          let entityType =
            res.data?.entityType === 'customer' || trigger.data.config.entityType === 'customer'
              ? 'customer'
              : 'lead'
          const resolvedListId = listId ? String(listId) : ''

          if (audienceMode === 'list' && resolvedListId) {
            const listRes = await api.get(`/api/dynamic-list/${resolvedListId}`)
            if (!cancelled && listRes?.success && listRes.data) {
              const list = listRes.data
              listConditionSource = {
                conditions: list.conditions,
                groupLogics: list.groupLogics,
                conditionGroups: list.conditionGroups,
                conditionLogic: list.conditionLogic,
              }
              listName = list.name || listName
              entityType = list.entityType === 'customer' ? 'customer' : entityType
            }
          }

          if (!cancelled) {
            const hydrated = hydrateContactGroupsFromAudience({
              audienceMode,
              entityType,
              baseCondition: res.data?.baseCondition,
              additionalFilter: res.data?.additionalFilter,
              listConditionSource:
                audienceMode === 'list' ? listConditionSource || res.data?.baseCondition : null,
            })
            trigger.data.config = {
              ...trigger.data.config,
              entityType,
              audienceMode,
              listID: audienceMode === 'list' ? resolvedListId : '',
              listName: audienceMode === 'list' ? listName : '',
              conditionLogic: hydrated.conditionLogic,
              additionalConditionLogic: hydrated.additionalConditionLogic,
              groups: hydrated.groups,
              triggerType: 'list',
              event: 'non',
            }
          }
        }
        if (!cancelled) loadWorkflowGraph(graph)
      } else if (!cancelled) {
        setLoadError(res?.error || 'Failed to load workflow.')
      }
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [loadWorkflowGraph])

  const persist = useCallback(
    async ({ publish = false }) => {
      setSaving(true)
      setSaveStatus('saving')

      const state = useWorkflowBuilderStore.getState()
      const isActive = publish ? true : state.isActive

      const { ok, payload, warnings, error } = graphToWorkflowPayload({
        workflowName: state.workflowName,
        nodes: state.nodes,
        edges: state.edges,
        isActive,
      })

      if (!ok) {
        setSaving(false)
        setSaveStatus('unsaved')
        toast.error(error)
        return
      }

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
      <WorkflowStepGuide
        activeCategory={guidedCategory}
        onSelectCategory={setGuidedCategory}
      />

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
