import {
  isWorkflowEventFormSubmission,
  normalizeWorkflowForPatch,
  normalizeWorkflowFromApi,
} from '@/lib/workflow-normalize'
import {
  BACKEND_STEP_NODES,
  getDefaultLabel,
  getPaletteItem,
} from '@/components/workflow/builder/constants'

const CENTER_X = 360
const START_Y = 24
const GAP_Y = 170

const NODE_TO_STEP_TYPE = {
  send_email: 'email',
  send_sms: 'sms',
  ai_agent: 'aiCall',
}

const STEP_TO_NODE_TYPE = {
  email: 'send_email',
  sms: 'send_sms',
  aiCall: 'ai_agent',
  humanCall: 'ai_agent',
}

const EVENT_TO_TRIGGER_NODE = {
  form_submission: 'contact',
  lead_updated: 'contact',
  lead_moved_stage: 'contact',
  custom_event: 'contact',
  non: 'contact',
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function waitToMinutes(config = {}) {
  const days = Math.max(0, Number(config.days) || 0)
  const hours = Math.max(0, Number(config.hours) || 0)
  const minutes = Math.max(0, Number(config.minutes) || 0)
  return days * 1440 + hours * 60 + minutes
}

/** Convert a total number of minutes from the trigger into backend day/hour/minute. */
function minutesToSchedule(totalMinutes) {
  const total = Math.max(0, Math.round(totalMinutes))
  return {
    day: Math.floor(total / 1440),
    hour: Math.floor((total % 1440) / 60),
    minute: total % 60,
  }
}

/** Convert a gap of minutes into a compound wait { days, hours, minutes }. */
function minutesToWait(totalMinutes) {
  const total = Math.max(0, Math.round(totalMinutes))
  return {
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
  }
}

function buildAdjacency(edges) {
  const bySource = new Map()
  for (const edge of edges) {
    if (!bySource.has(edge.source)) bySource.set(edge.source, [])
    bySource.get(edge.source).push(edge)
  }
  return bySource
}

/**
 * Walk the linear path from the trigger. Backend workflows are linear (day-based),
 * so when a node branches we follow the primary path and report the rest as a warning.
 */
function walkChain(triggerId, nodeMap, bySource) {
  const order = []
  const warnings = []
  const visited = new Set([triggerId])

  let currentId = triggerId
  while (currentId) {
    const outgoing = (bySource.get(currentId) || []).filter((e) => !visited.has(e.target))
    if (outgoing.length === 0) break

    if (outgoing.length > 1) {
      const label = nodeMap.get(currentId)?.data?.label || 'a step'
      warnings.push(
        `Branches after "${label}" aren't saved — the backend runs a single linear sequence, so only the primary path is kept.`
      )
    }

    const primary =
      outgoing.find((e) => e.sourceHandle === 'yes') || outgoing[0]
    const nextId = primary.target
    if (visited.has(nextId)) break

    visited.add(nextId)
    order.push(nextId)
    currentId = nextId
  }

  return { order, warnings }
}

function stepFromNode(node, offsetMinutes) {
  const config = node.data?.config || {}
  const paletteType = node.data?.paletteType
  const type = NODE_TO_STEP_TYPE[paletteType]
  if (!type) return null

  const schedule = minutesToSchedule(offsetMinutes)

  const base = {
    type,
    leadStage: config.leadStage || 'new',
    description: config.description || node.data?.label || '',
    day: schedule.day,
    hour: schedule.hour,
    minute: schedule.minute,
  }

  if (type === 'email') {
    const emailType = config.emailType === 'template' ? 'template' : 'message'
    return {
      ...base,
      emailType,
      subject: config.subject || '',
      ...(emailType === 'template'
        ? { htmlBody: config.htmlBody || '' }
        : { script: config.body || config.script || '' }),
    }
  }

  if (type === 'sms') {
    return { ...base, script: config.message || config.script || '' }
  }

  // aiCall — backend only stores the base fields (description carries the prompt).
  return {
    ...base,
    description: config.prompt || base.description,
  }
}

/**
 * Convert the visual builder graph into a payload accepted by POST/PATCH /api/workflow.
 * Returns { ok, payload, warnings, error }.
 */
export function graphToWorkflowPayload({ workflowName, nodes = [], edges = [], isActive = true }) {
  const warnings = []

  const name = String(workflowName || '').trim()
  if (!name) {
    return { ok: false, error: 'Add a workflow name before saving.', warnings }
  }

  const triggerNode = nodes.find((n) => n.data?.category === 'trigger')
  if (!triggerNode) {
    return { ok: false, error: 'Add a trigger step so the backend knows what starts this workflow.', warnings }
  }

  const triggerConfig = triggerNode.data?.config || {}
  const audienceMode = triggerConfig.audienceMode
  const hasContactAudience = audienceMode === 'all' || audienceMode === 'list'
  const triggerType =
    hasContactAudience || triggerConfig.triggerType === 'list' || triggerConfig.listID
      ? 'list'
      : 'event'
  const listID = String(triggerConfig.listID || '').trim()
  const reason = String(triggerConfig.reason || '').trim()

  if (triggerType === 'list') {
    if (!listID) {
      return {
        ok: false,
        error:
          audienceMode === 'all'
            ? 'Add filters in Contact so we can build the audience list for this workflow.'
            : 'Select a dynamic list in the Contact step before saving.',
        warnings,
      }
    }
  } else {
    const event = triggerConfig.event || 'non'
    const isGenericForm = Boolean(triggerConfig.isGenericForm)
    const formID = Array.isArray(triggerConfig.formID) ? triggerConfig.formID.filter(Boolean) : []

    if (isWorkflowEventFormSubmission(event) && !isGenericForm && formID.length === 0) {
      return {
        ok: false,
        error: 'For a "Form submission" trigger, pick at least one form or enable "All forms".',
        warnings,
      }
    }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const bySource = buildAdjacency(edges)
  const { order, warnings: walkWarnings } = walkChain(triggerNode.id, nodeMap, bySource)
  warnings.push(...walkWarnings)

  let offsetMinutes = 0
  const steps = []

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId)
    if (!node) continue
    const paletteType = node.data?.paletteType

    if (paletteType === 'wait') {
      offsetMinutes += waitToMinutes(node.data?.config)
      continue
    }

    if (paletteType === 'exit_logic') {
      continue
    }

    if (BACKEND_STEP_NODES.has(paletteType)) {
      const step = stepFromNode(node, offsetMinutes)
      if (step) steps.push(step)
      continue
    }

    const label = node.data?.label || getDefaultLabel(paletteType)
    warnings.push(`"${label}" isn't supported by the current backend and was skipped.`)
  }

  if (steps.length === 0) {
    return {
      ok: false,
      error: 'Add at least one Send Email, Send SMS, or AI Agent step — those are the actions the backend can run.',
      warnings,
    }
  }

  const payload = normalizeWorkflowForPatch({
    name,
    description: '',
    ...(triggerType === 'list'
      ? { listID, reason }
      : {
          event: triggerConfig.event || 'non',
          formID: Array.isArray(triggerConfig.formID) ? triggerConfig.formID : [],
          isGenericForm: Boolean(triggerConfig.isGenericForm),
          reason: isWorkflowEventFormSubmission(triggerConfig.event) ? reason : '',
        }),
    steps,
  })

  payload.status = isActive ? 'active' : 'inactive'

  return { ok: true, payload, warnings }
}

function triggerNodeFromWorkflow(wf) {
  const listID = wf.listID || ''
  const listName = wf.listName || ''
  const isListBased = Boolean(listID)
  const event = wf.event || 'non'
  const entityType = wf.entityType === 'customer' ? 'customer' : 'lead'
  const paletteType = isListBased ? 'contact' : EVENT_TO_TRIGGER_NODE[event] || 'contact'
  const item = getPaletteItem(paletteType)
  return {
    id: 'node-trigger',
    type: 'workflowNode',
    position: { x: CENTER_X, y: START_Y },
    data: {
      paletteType,
      category: 'trigger',
      label: item?.label || 'Contact',
      config: {
        entityType,
        audienceMode: isListBased ? 'list' : '',
        listID,
        listName,
        conditionLogic: wf.conditionLogic === 'OR' ? 'OR' : 'AND',
        groups: Array.isArray(wf.conditionGroups)
          ? wf.conditionGroups
          : Array.isArray(wf.groups)
            ? wf.groups
            : [],
        triggerType: isListBased ? 'list' : 'event',
        event,
        formID: Array.isArray(wf.formIDs) ? wf.formIDs : [],
        isGenericForm: Boolean(wf.isGenericForm),
        reason: wf.reason || '',
        exitType: wf.exitType || 'none',
      },
    },
  }
}

function makeNodeBase(id, paletteType, y, config) {
  const item = getPaletteItem(paletteType)
  return {
    id,
    type: 'workflowNode',
    position: { x: CENTER_X, y },
    data: {
      paletteType,
      category: item?.category || 'action',
      label: item?.label || 'Step',
      config,
    },
  }
}

function actionNodeFromStep(step, index, y) {
  const paletteType = STEP_TO_NODE_TYPE[step.type] || 'send_email'
  const id = `node-step-${index}-${Math.random().toString(36).slice(2, 6)}`

  const base = {
    leadStage: step.leadStage || 'new',
    description: step.description || '',
  }

  let config = base
  if (paletteType === 'send_email') {
    const emailType = step.emailType === 'template' ? 'template' : 'message'
    config = {
      ...base,
      emailType,
      subject: step.subject || '',
      body: step.script || '',
      htmlBody: step.htmlBody || '',
      emailTemplateId: step.emailTemplateId || '',
      emailTemplateSubject: step.emailTemplateSubject || '',
    }
  } else if (paletteType === 'send_sms') {
    config = {
      ...base,
      message: step.script || '',
      smsTemplateId: step.smsTemplateId || '',
      smsTemplateName: step.smsTemplateName || '',
    }
  } else if (paletteType === 'ai_agent') {
    config = { ...base, prompt: step.description || '' }
  }

  return makeNodeBase(id, paletteType, y, config)
}

function stepTotalMinutes(step) {
  return (Number(step.day) || 0) * 1440 + (Number(step.hour) || 0) * 60 + (Number(step.minute) || 0)
}

function flattenSteps(stepsByDay) {
  if (!Array.isArray(stepsByDay)) return []
  const flat = stepsByDay.flat(1).filter(Boolean)
  return flat
    .map((step, i) => ({ step, i }))
    .sort((a, b) => {
      const da = Number(a.step.day) || 0
      const db = Number(b.step.day) || 0
      if (da !== db) return da - db
      const ha = Number(a.step.hour) || 0
      const hb = Number(b.step.hour) || 0
      if (ha !== hb) return ha - hb
      const ma = Number(a.step.minute) || 0
      const mb = Number(b.step.minute) || 0
      if (ma !== mb) return ma - mb
      return a.i - b.i
    })
    .map((entry) => entry.step)
}

/**
 * Convert an API workflow (from GET /api/workflow/:id) into builder nodes + edges.
 */
export function workflowToGraph(apiWorkflow) {
  const wf = normalizeWorkflowFromApi(apiWorkflow) || {}

  const trigger = triggerNodeFromWorkflow(wf)
  const nodes = [trigger]
  const edges = []

  const steps = flattenSteps(wf.stepsByDay)
  let prevId = trigger.id
  let prevMinutes = 0
  let y = START_Y + GAP_Y

  const connect = (node) => {
    nodes.push(node)
    edges.push({
      id: `e-${prevId}-${node.id}`,
      source: prevId,
      target: node.id,
      type: 'smoothstep',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      pathOptions: { borderRadius: 20 },
    })
    prevId = node.id
    y += GAP_Y
  }

  steps.forEach((step, index) => {
    const total = stepTotalMinutes(step)
    const gap = total - prevMinutes
    if (gap > 0) {
      const waitNode = makeNodeBase(
        `node-wait-${index}-${Math.random().toString(36).slice(2, 6)}`,
        'wait',
        y,
        minutesToWait(gap)
      )
      connect(waitNode)
    }
    connect(actionNodeFromStep(step, index, y))
    prevMinutes = total
  })

  return {
    workflowId: apiWorkflow?._id || apiWorkflow?.id || null,
    workflowName: wf.name || 'Untitled automation',
    isActive: (apiWorkflow?.status || 'active') !== 'inactive',
    nodes,
    edges,
  }
}
