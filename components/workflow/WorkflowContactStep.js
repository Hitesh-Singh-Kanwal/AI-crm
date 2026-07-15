'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, ListFilter, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import {
  DYNAMIC_LIST_ENTITY_LABELS,
  DYNAMIC_LIST_ENTITY_TYPES,
} from '@/lib/dynamic-list-constants'
import {
  buildConditionGroupsFromFlat,
  extractDynamicListsList,
} from '@/lib/dynamic-list-normalize'
import { extractFormTemplatesList, extractLeadReasonsList } from '@/lib/workflow-normalize'
import {
  getContactConfigFromTrigger,
  splitContactConditionGroups,
  summarizeContactConfig,
} from '@/lib/workflow-contact'
import LeadConditionsEditor from '@/components/shared/LeadConditionsEditor'

function ChoiceCard({ selected, title, description, icon: Icon, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/[0.06] shadow-sm'
          : 'border-border bg-card hover:border-[var(--studio-primary)]/40 hover:bg-muted/20',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          selected
            ? 'bg-[var(--studio-primary)] text-white'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {selected ? <Check className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-foreground">{title}</div>
        {description ? (
          <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
    </button>
  )
}

function collectFieldsFromGroups(groups = []) {
  const fields = new Set()
  for (const group of groups || []) {
    for (const condition of group.conditions || []) {
      if (condition?.field) fields.add(condition.field)
    }
  }
  return fields
}

export default function WorkflowContactStep({ config, onChange, compact = false }) {
  const contact = useMemo(() => getContactConfigFromTrigger(config), [config])
  const entityType = contact.entityType || 'lead'
  const isCustomer = entityType === 'customer'
  const entityLabel = isCustomer ? 'customers' : 'leads'
  const EntitySingular = isCustomer ? 'Customer' : 'Lead'

  const [dynamicLists, setDynamicLists] = useState([])
  const [leadReasons, setLeadReasons] = useState([])
  const [locations, setLocations] = useState([])
  const [forms, setForms] = useState([])
  const [teachers, setTeachers] = useState([])
  const [tags, setTags] = useState([])
  const [memberships, setMemberships] = useState([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingLists, setLoadingLists] = useState(false)
  const [loadingListConditions, setLoadingListConditions] = useState(false)

  const patch = (next) => onChange?.({ ...contact, ...next })

  const { baseGroups, additionalGroups } = useMemo(
    () => splitContactConditionGroups(contact.groups, contact.audienceMode),
    [contact.groups, contact.audienceMode]
  )

  const mutedBaseFields = useMemo(() => collectFieldsFromGroups(baseGroups), [baseGroups])

  const editorOptions = {
    leadReasons,
    locations,
    forms,
    teachers,
    tags,
    memberships,
    loadingOptions,
  }

  const applyListConditions = async (listId, listName) => {
    if (!listId) {
      patch({
        listID: '',
        listName: '',
        groups: [],
        conditionLogic: 'AND',
        additionalConditionLogic: 'AND',
        triggerType: 'list',
      })
      return
    }

    setLoadingListConditions(true)
    const res = await api.get(`/api/dynamic-list/${listId}`)
    setLoadingListConditions(false)

    const list = res?.success ? res.data : null
    const listGroups = list
      ? buildConditionGroupsFromFlat({
          conditions: list.conditions,
          groupLogics: list.groupLogics,
          conditionGroups: list.conditionGroups,
          entityType: list.entityType === 'customer' ? 'customer' : entityType,
        }).map((group) => ({ ...group, locked: true }))
      : []

    // Selecting a list always resets additional filters (no carry-over from All / previous list).
    patch({
      listID: listId,
      listName: list?.name || listName || '',
      conditionLogic: list?.conditionLogic === 'OR' ? 'OR' : 'AND',
      additionalConditionLogic: 'AND',
      groups: listGroups,
      triggerType: 'list',
      event: 'non',
    })
  }

  useEffect(() => {
    let cancelled = false
    setLoadingLists(true)
    api
      .get(`/api/dynamic-list?status=active&limit=200&entityType=${entityType}`)
      .then((res) => {
        if (cancelled) return
        const lists = res?.success ? extractDynamicListsList(res) : []
        setDynamicLists(lists.filter((l) => (l?.entityType || 'lead') === entityType))
        setLoadingLists(false)
      })
    return () => {
      cancelled = true
    }
  }, [entityType])

  useEffect(() => {
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
      requests.push(api.get('/api/lead-reasons'), api.get('/api/formBuilder?page=1&limit=200'))
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
  }, [isCustomer])

  const showAudience = Boolean(contact.entityType)
  const showFilters =
    contact.audienceMode === 'all' ||
    (contact.audienceMode === 'list' && Boolean(contact.listID))

  const resetAudienceFilters = {
    listID: '',
    listName: '',
    groups: [],
    conditionLogic: 'AND',
    additionalConditionLogic: 'AND',
    triggerType: 'list',
    event: 'non',
  }

  return (
    <div className={cn('space-y-5', !compact && 'mx-auto w-full max-w-3xl space-y-8 p-6')}>
      {!compact ? (
        <div>
          <h2 className="text-[22px] font-bold text-foreground">Who should enter this workflow?</h2>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Choose leads or customers, then pick everyone or a dynamic list. Optionally narrow with the
            same filters used on Leads and Dynamic Lists.
          </p>
          <p className="mt-2 text-[12px] font-medium text-[var(--studio-primary)]">
            {summarizeContactConfig(contact)}
          </p>
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">{summarizeContactConfig(contact)}</p>
      )}

      <section className="space-y-3">
        <div className="text-[13px] font-semibold text-foreground">
          {compact ? 'Contact type' : '1. Contact type'}
        </div>
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
          {DYNAMIC_LIST_ENTITY_TYPES.map((value) => (
            <ChoiceCard
              key={value}
              selected={entityType === value}
              title={DYNAMIC_LIST_ENTITY_LABELS[value]}
              description={
                value === 'lead'
                  ? 'Prospects who have not converted yet'
                  : 'Existing studio customers'
              }
              icon={Users}
              onClick={() =>
                patch({
                  entityType: value,
                  audienceMode: '',
                  ...resetAudienceFilters,
                })
              }
            />
          ))}
        </div>
      </section>

      {showAudience ? (
        <section className="space-y-3">
          <div className="text-[13px] font-semibold text-foreground">
            {compact ? `Select ${entityLabel}` : `2. Select ${entityLabel}`}
          </div>
          <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
            <ChoiceCard
              selected={contact.audienceMode === 'all'}
              title={`All ${entityLabel}`}
              description={`Include every ${entityLabel.slice(0, -1)} that matches the filters below`}
              icon={Users}
              onClick={() =>
                patch({
                  audienceMode: 'all',
                  ...resetAudienceFilters,
                })
              }
            />
            <ChoiceCard
              selected={contact.audienceMode === 'list'}
              title="Dynamic list"
              description={`Use a saved ${EntitySingular.toLowerCase()} list as the audience`}
              icon={ListFilter}
              onClick={() =>
                patch({
                  audienceMode: 'list',
                  ...resetAudienceFilters,
                })
              }
            />
          </div>

          {contact.audienceMode === 'list' ? (
            <div className={cn(compact ? '' : 'rounded-2xl border border-border bg-card p-4')}>
              <label className="mb-2 block text-[12px] font-semibold text-foreground">
                Choose a dynamic list
              </label>
              <select
                value={contact.listID || ''}
                disabled={loadingLists || loadingListConditions}
                onChange={(e) => {
                  const nextId = e.target.value
                  const selected = dynamicLists.find((l) => (l?._id || l?.id) === nextId)
                  applyListConditions(nextId, selected?.name || '')
                }}
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-[var(--studio-primary)]"
              >
                <option value="">
                  {loadingLists
                    ? 'Loading lists…'
                    : loadingListConditions
                      ? 'Loading list filters…'
                      : 'Select a list'}
                </option>
                {dynamicLists.map((list) => {
                  const id = list?._id || list?.id
                  return (
                    <option key={id} value={id}>
                      {list.name}
                      {typeof list.memberCount === 'number' ? ` (${list.memberCount})` : ''}
                    </option>
                  )
                })}
              </select>
              {!loadingLists && dynamicLists.length === 0 ? (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  No active {entityLabel} lists yet. Create one under Dynamic Lists, or choose “All{' '}
                  {entityLabel}” and apply filters.
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">
                  List conditions load as read-only base. Add optional filters in the additional box.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {showFilters ? (
        <section className="space-y-3">
          <div>
            <div className="text-[13px] font-semibold text-foreground">
              {compact ? 'Filters' : '3. Filters'}
            </div>
            {!compact ? (
              <p className="mt-1 text-[12px] text-muted-foreground">
                {contact.audienceMode === 'list'
                  ? 'Base conditions come from the selected list and cannot be edited. Add any extra filters in the additional box — fields already used in base are muted.'
                  : 'Filters you build here are saved as baseCondition in the workflow payload.'}
              </p>
            ) : null}
          </div>

          {loadingListConditions ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-[13px] text-muted-foreground">
              Loading list filters…
            </div>
          ) : contact.audienceMode === 'list' ? (
            <div className="space-y-4">
              <div
                className={cn(
                  'space-y-3',
                  !compact && 'rounded-2xl border border-border bg-muted/10 p-4'
                )}
              >
                <div>
                  <div className="text-[12px] font-semibold text-foreground">Base conditions</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    From the selected dynamic list · read-only
                  </p>
                </div>
                <LeadConditionsEditor
                  entityType={entityType}
                  groups={baseGroups}
                  conditionLogic={contact.conditionLogic || 'AND'}
                  onChangeGroups={() => {}}
                  onChangeLogic={() => {}}
                  readOnly
                  emptyTitle="No base conditions"
                  emptyDescription="This dynamic list has no saved filters."
                  {...editorOptions}
                />
              </div>

              <div
                className={cn(
                  'space-y-3',
                  !compact && 'rounded-2xl border border-border bg-card p-4'
                )}
              >
                <div>
                  <div className="text-[12px] font-semibold text-foreground">Additional filters</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Optional · fields already in base conditions are muted
                  </p>
                </div>
                <LeadConditionsEditor
                  entityType={entityType}
                  groups={additionalGroups}
                  conditionLogic={contact.additionalConditionLogic || 'AND'}
                  onChangeGroups={(groups) => {
                    const nextAdditional = (groups || []).map((g) => ({ ...g, locked: false }))
                    patch({ groups: [...baseGroups, ...nextAdditional] })
                  }}
                  onChangeLogic={(additionalConditionLogic) => patch({ additionalConditionLogic })}
                  mutedFields={mutedBaseFields}
                  emptyTitle="No additional filters"
                  emptyDescription="Add optional filters on top of the list base conditions."
                  addGroupLabel="Add additional filter"
                  {...editorOptions}
                />
              </div>
            </div>
          ) : (
            <div className={cn(!compact && 'rounded-2xl border border-border bg-card p-4')}>
              <LeadConditionsEditor
                entityType={entityType}
                groups={contact.groups || []}
                conditionLogic={contact.conditionLogic || 'AND'}
                onChangeGroups={(groups) =>
                  patch({ groups: (groups || []).map((g) => ({ ...g, locked: false })) })
                }
                onChangeLogic={(conditionLogic) => patch({ conditionLogic })}
                emptyTitle="No base conditions yet"
                emptyDescription="Build the filters that define who enters this workflow."
                {...editorOptions}
              />
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
