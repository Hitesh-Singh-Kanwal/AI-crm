'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createEmptyWorkflowStep,
  ensureStepsByDayUiIds,
  insertWorkflowDay,
  nextWorkflowDay,
} from '@/lib/workflow-normalize'
import WorkflowSortableStepCard from '@/components/workflow/WorkflowSortableStepCard'
import WorkflowStepEditorPanel from '@/components/workflow/WorkflowStepEditorPanel'

function dayLabel(day) {
  if (day === 0) return 'Day 0'
  return `Day ${day}`
}

function daySubtitle(day) {
  if (day === 0) return 'Immediately after trigger'
  if (day === 1) return '1 day after trigger'
  return `${day} days after trigger`
}

export default function WorkflowStepsBuilder({
  stepsByDay = [],
  onChange,
  leadStageOptions = [],
}) {
  const [expandedUiId, setExpandedUiId] = useState(null)
  const [customDayInput, setCustomDayInput] = useState('')
  const [addDayError, setAddDayError] = useState('')
  const patchingIdsRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Backfill _uiId for steps created before drag-and-drop support
  useEffect(() => {
    if (patchingIdsRef.current) return
    const needsIds = stepsByDay.some((group) => group?.some((s) => !s?._uiId))
    if (!needsIds) return
    patchingIdsRef.current = true
    onChange?.(ensureStepsByDayUiIds(stepsByDay))
    queueMicrotask(() => {
      patchingIdsRef.current = false
    })
  }, [stepsByDay, onChange])

  const suggestedNextDay = useMemo(() => nextWorkflowDay(stepsByDay), [stepsByDay])

  const expandedStep = useMemo(() => {
    if (!expandedUiId) return null
    for (let dayIdx = 0; dayIdx < stepsByDay.length; dayIdx += 1) {
      const daySteps = stepsByDay[dayIdx]
      const stepIdx = daySteps.findIndex((s) => s._uiId === expandedUiId)
      if (stepIdx >= 0) {
        return {
          dayIdx,
          stepIdx,
          stepNumber: stepIdx + 1,
          day: daySteps[0]?.day ?? dayIdx,
          step: daySteps[stepIdx],
        }
      }
    }
    return null
  }, [expandedUiId, stepsByDay])

  const updateDaySteps = (dayIdx, updater) => {
    onChange?.(
      stepsByDay.map((daySteps, i) => {
        if (i !== dayIdx) return daySteps
        const next = typeof updater === 'function' ? updater(daySteps) : updater
        return ensureStepsByDayUiIds([next])[0]
      })
    )
  }

  const addStepToDay = (dayIdx) => {
    const day = stepsByDay[dayIdx]?.[0]?.day ?? dayIdx
    updateDaySteps(dayIdx, (daySteps) => [...daySteps, createEmptyWorkflowStep(day)])
  }

  const removeStep = (dayIdx, stepIdx) => {
    const daySteps = stepsByDay[dayIdx]
    if (!daySteps || daySteps.length <= 1) return
    const removed = daySteps[stepIdx]
    updateDaySteps(dayIdx, daySteps.filter((_, i) => i !== stepIdx))
    if (removed?._uiId === expandedUiId) setExpandedUiId(null)
  }

  const saveStep = (dayIdx, stepIdx, draft) => {
    updateDaySteps(dayIdx, (daySteps) =>
      daySteps.map((s, i) => (i === stepIdx ? { ...draft, _uiId: s._uiId } : s))
    )
  }

  const closeStepEditor = () => {
    setExpandedUiId(null)
  }

  const handleDayDragEnd = (dayIdx, event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const daySteps = stepsByDay[dayIdx]
    const oldIndex = daySteps.findIndex((s) => String(s._uiId) === String(active.id))
    const newIndex = daySteps.findIndex((s) => String(s._uiId) === String(over.id))
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

    updateDaySteps(dayIdx, arrayMove(daySteps, oldIndex, newIndex))
  }

  const addDayAt = (day) => {
    const result = insertWorkflowDay(stepsByDay, day)
    if (!result.ok) {
      setAddDayError(result.error)
      return
    }
    setAddDayError('')
    setCustomDayInput('')
    onChange?.(ensureStepsByDayUiIds(result.stepsByDay))
  }

  const addNextDay = () => addDayAt(suggestedNextDay)

  const addCustomDay = () => {
    const raw = customDayInput.trim()
    if (raw === '') {
      setAddDayError('Enter a day number (e.g. 12).')
      return
    }
    const day = Number(raw)
    if (!Number.isFinite(day) || day < 0) {
      setAddDayError('Day must be a number greater than or equal to 0.')
      return
    }
    addDayAt(day)
  }

  const removeDay = (dayIdx) => {
    if (stepsByDay.length <= 1) return
    const removedIds = new Set((stepsByDay[dayIdx] || []).map((s) => s._uiId))
    if (expandedUiId && removedIds.has(expandedUiId)) setExpandedUiId(null)
    onChange?.(stepsByDay.filter((_, i) => i !== dayIdx))
  }

  const toggleStep = (uiId) => {
    if (!uiId) return
    setExpandedUiId((prev) => (prev === uiId ? null : uiId))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border bg-muted/10">
        <div className="min-w-[640px] p-4">
          {stepsByDay.map((daySteps, dayIdx) => {
            const day = daySteps[0]?.day ?? dayIdx
            const isDayWithExpanded = expandedStep?.dayIdx === dayIdx
            const sortableIds = daySteps.map((s) => s._uiId).filter(Boolean)

            return (
              <div
                key={`day-${dayIdx}-${day}`}
                className={cn(
                  'space-y-3',
                  dayIdx > 0 && 'mt-6 border-t border-border pt-6'
                )}
              >
                <div className="flex gap-4">
                  <div className="w-36 shrink-0 pt-2">
                    <div className="sticky top-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-[13px] font-bold text-primary">
                        {day}
                      </div>
                      <div className="mt-2 text-[13px] font-semibold text-foreground">{dayLabel(day)}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{daySubtitle(day)}</div>
                      {stepsByDay.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(dayIdx)}
                          className="mt-2 text-[11px] font-medium text-destructive hover:underline"
                        >
                          Remove day
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDayDragEnd(dayIdx, event)}
                    >
                      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
                        <div className="flex flex-nowrap items-start gap-3 overflow-x-auto pb-1">
                          {daySteps.map((step, stepIdx) => (
                            <WorkflowSortableStepCard
                              key={step._uiId}
                              id={step._uiId}
                              step={step}
                              day={day}
                              stepNumber={stepIdx + 1}
                              isSelected={expandedUiId === step._uiId}
                              showArrowAfter={stepIdx < daySteps.length - 1}
                              onSelect={() => toggleStep(step._uiId)}
                            />
                          ))}

                          <button
                            type="button"
                            onClick={() => addStepToDay(dayIdx)}
                            className="flex h-[148px] w-[52px] shrink-0 items-center justify-center self-stretch rounded-xl border border-dashed border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                            title={`Add step to ${dayLabel(day)}`}
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>

                {isDayWithExpanded && expandedStep && (
                  <WorkflowStepEditorPanel
                    day={expandedStep.day}
                    stepNumber={expandedStep.stepNumber}
                    step={expandedStep.step}
                    leadStageOptions={leadStageOptions}
                    canRemove={daySteps.length > 1}
                    onSave={(draft) => saveStep(expandedStep.dayIdx, expandedStep.stepIdx, draft)}
                    onClose={closeStepEditor}
                    onRemove={() => removeStep(expandedStep.dayIdx, expandedStep.stepIdx)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <div className="text-[13px] font-semibold text-foreground">Add a day</div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Add the next day in sequence, or jump ahead to a specific day (e.g. Day 12 after Day 4).
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addNextDay}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[13px] font-semibold text-foreground hover:bg-muted/40"
          >
            <Plus className="h-4 w-4" />
            Add next day (Day {suggestedNextDay})
          </button>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <span className="text-[13px] text-muted-foreground">Or day</span>
            <input
              type="number"
              min={0}
              value={customDayInput}
              onChange={(e) => {
                setCustomDayInput(e.target.value)
                if (addDayError) setAddDayError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomDay()
                }
              }}
              placeholder="12"
              className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-center text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              aria-label="Custom day number"
            />
            <button
              type="button"
              onClick={addCustomDay}
              className="inline-flex h-9 items-center rounded-lg bg-[var(--studio-primary)] px-4 text-[13px] font-semibold text-white hover:brightness-95"
            >
              Add
            </button>
          </div>
        </div>
        {addDayError && (
          <p className="mt-3 text-[12px] text-destructive" role="alert">
            {addDayError}
          </p>
        )}
      </div>
    </div>
  )
}
