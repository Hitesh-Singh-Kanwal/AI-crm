'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { STATUS_OPTIONS } from '@/lib/dynamic-list-constants'
import {
  buildConditionGroupsFromFlat,
  buildDynamicListPayload,
  flattenConditionGroups,
  formatFieldDisplayValue,
  inferCatalogGroupId,
  normalizeDynamicListFromApi,
} from '@/lib/dynamic-list-normalize'
import { extractFormTemplatesList, extractLeadReasonsList } from '@/lib/workflow-normalize'
import LeadConditionsEditor, { isConditionComplete } from '@/components/shared/LeadConditionsEditor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function createEmptyForm(entityType = 'lead') {
  return {
    name: '',
    description: '',
    entityType,
    conditionLogic: 'AND',
    groups: [],
    status: 'active',
  }
}

function formFromList(list, fallbackEntityType = 'lead') {
  if (!list) return createEmptyForm(fallbackEntityType)
  const normalized = normalizeDynamicListFromApi(list)
  const entityType = list.entityType || normalized?.entityType || fallbackEntityType
  const groups = buildConditionGroupsFromFlat({
    conditions: list.conditions?.length ? list.conditions : normalized?.conditions,
    groupLogics: list.groupLogics,
    conditionGroups: list.conditionGroups,
    entityType,
  })

  return {
    name: normalized?.name || list.name || '',
    description: normalized?.description || list.description || '',
    entityType,
    conditionLogic: list.conditionLogic || normalized?.conditionLogic || 'AND',
    groups,
    status: list.status || normalized?.status || 'active',
  }
}

export default function DynamicListFormDialog({
  open,
  onClose,
  list,
  onSaved,
  entityType: defaultEntityType = 'lead',
}) {
  const isEdit = Boolean(list?._id || list?.id)
  const resolvedEntityType = list?.entityType || defaultEntityType
  const isCustomer = resolvedEntityType === 'customer'
  const [form, setForm] = useState(createEmptyForm(resolvedEntityType))
  const [leadReasons, setLeadReasons] = useState([])
  const [locations, setLocations] = useState([])
  const [forms, setForms] = useState([])
  const [teachers, setTeachers] = useState([])
  const [tags, setTags] = useState([])
  const [memberships, setMemberships] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(list ? formFromList(list, defaultEntityType) : createEmptyForm(defaultEntityType))
  }, [open, list, defaultEntityType])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingOptions(true)

    const requests = [api.get('/api/location?limit=200')]
    if (isCustomer) {
      requests.push(
        api.get('/api/teacher?limit=200&status=active'),
        api.get('/api/customer/tags'),
        api.get('/api/membership?limit=200')
      )
    } else {
      requests.push(
        api.get('/api/lead-reasons'),
        api.get('/api/formBuilder?page=1&limit=200')
      )
    }

    Promise.all(requests).then((results) => {
      if (cancelled) return
      const locationsRes = results[0]
      if (locationsRes?.success) {
        setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : [])
      }
      if (isCustomer) {
        const [, teachersRes, tagsRes, membershipsRes] = results
        if (teachersRes?.success) setTeachers(teachersRes.data || [])
        if (tagsRes?.success) setTags(tagsRes.data || [])
        if (membershipsRes?.success) setMemberships(membershipsRes.data || [])
      } else {
        const [, reasonsRes, formsRes] = results
        if (reasonsRes?.success) setLeadReasons(extractLeadReasonsList(reasonsRes))
        if (formsRes?.success) setForms(extractFormTemplatesList(formsRes))
      }
      setLoadingOptions(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, isCustomer])

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false
    if (!Array.isArray(form.groups) || form.groups.length === 0) return false
    const entity = form.entityType || defaultEntityType
    return form.groups.every((group) => {
      const catalogGroupId = inferCatalogGroupId(group, entity)
      if (!catalogGroupId) return false
      return (
        Array.isArray(group.conditions) &&
        group.conditions.length > 0 &&
        group.conditions.every(isConditionComplete)
      )
    })
  }, [form, defaultEntityType])

  const submit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError('')
    const { conditions, groupLogics, conditionGroups } = flattenConditionGroups(form.groups)
    const payload = buildDynamicListPayload({
      ...form,
      entityType: form.entityType || defaultEntityType,
      conditions,
      groupLogics,
      conditionGroups,
    })
    const id = list?._id || list?.id
    const res = isEdit
      ? await api.patch(`/api/dynamic-list/${id}`, payload)
      : await api.post('/api/dynamic-list', payload)

    if (res?.success) {
      onSaved?.({
        list: res?.data || { ...payload, _id: id },
        isEdit,
      })
      onClose?.()
    } else {
      setError(res?.error || `Failed to ${isEdit ? 'update' : 'create'} dynamic list.`)
    }
    setSaving(false)
  }

  const entityLabel = isCustomer ? 'customers' : 'leads'

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="4xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={saving ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit dynamic list' : 'Create dynamic list'}</DialogTitle>
          <DialogDescription>
            Pick a filter group, then a filter. Use and / or to add more filters inside a group, or another
            filter group.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={isCustomer ? 'High-value customers' : 'New form leads'}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {formatFieldDisplayValue(opt)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Optional description"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="mb-4">
              <div className="text-[14px] font-semibold text-foreground">Include {entityLabel}</div>
              <div className="text-[12px] text-muted-foreground">
                Level 1: filter group → filter. Then choose and / or before adding another filter or group.
              </div>
            </div>

            <LeadConditionsEditor
              entityType={form.entityType || defaultEntityType}
              groups={form.groups}
              conditionLogic={form.conditionLogic}
              onChangeGroups={(groups) => setForm((p) => ({ ...p, groups }))}
              onChangeLogic={(conditionLogic) => setForm((p) => ({ ...p, conditionLogic }))}
              leadReasons={leadReasons}
              locations={locations}
              forms={forms}
              teachers={teachers}
              tags={tags}
              memberships={memberships}
              loadingOptions={loadingOptions}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create list'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
