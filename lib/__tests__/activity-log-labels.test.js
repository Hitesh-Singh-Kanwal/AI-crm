import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_ACTION_FILTER_OPTIONS,
  ACTIVITY_MODULE_FILTER_OPTIONS,
  buildActivityPageItems,
  cleanActivityDescription,
  formatActivityDetail,
  isValidActivityFilter,
  moduleLabel,
  resolveActivityActor,
  resolveActivityVerb,
} from '../activity-log-labels'

describe('activity-log-labels', () => {
  it('moduleLabel maps stored entity names', () => {
    expect(moduleLabel('lead')).toBe('Leads')
    expect(moduleLabel('CalendarEvent')).toBe('Calendar')
    expect(moduleLabel('aiCalling')).toBe('AI Calling')
  })

  it('cleanActivityDescription strips legacy performer suffix', () => {
    expect(cleanActivityDescription('Added lead Jane - Maya (staff)')).toBe(
      'Added lead Jane',
    )
    expect(cleanActivityDescription('Booked intro lesson')).toBe('Booked intro lesson')
  })

  it('resolveActivityActor prefers doneBy', () => {
    expect(
      resolveActivityActor({
        doneBy: { name: 'Maya Patel', role: 'staff' },
        description: 'Added lead Jane - Other (admin)',
      }),
    ).toEqual({ name: 'Maya Patel', roleLabel: 'Staff' })
  })

  it('resolveActivityVerb prefers metadata.verb', () => {
    expect(resolveActivityVerb({ action: 'created', metadata: { verb: 'Booked' } })).toBe(
      'Booked',
    )
    expect(resolveActivityVerb({ action: 'updated' })).toBe('Updated')
  })

  it('rejects stale persisted filter values', () => {
    expect(isValidActivityFilter('leads', ACTIVITY_MODULE_FILTER_OPTIONS)).toBe(false)
    expect(isValidActivityFilter('login', ACTIVITY_ACTION_FILTER_OPTIONS)).toBe(false)
    expect(isValidActivityFilter('email', ACTIVITY_MODULE_FILTER_OPTIONS)).toBe(true)
    expect(isValidActivityFilter('booked', ACTIVITY_ACTION_FILTER_OPTIONS)).toBe(true)
  })

  it('buildActivityPageItems shows first five, current, and last', () => {
    expect(buildActivityPageItems(1, 3).map((i) => i.page || i.type)).toEqual([1, 2, 3])
    expect(buildActivityPageItems(8, 20).map((i) => (i.type === 'page' ? i.page : '…'))).toEqual([
      1, 2, 3, 4, 5, '…', 8, '…', 20,
    ])
    expect(buildActivityPageItems(3, 20).map((i) => (i.type === 'page' ? i.page : '…'))).toEqual([
      1, 2, 3, 4, 5, '…', 20,
    ])
    // Out-of-range current page must not invent a phantom button
    expect(buildActivityPageItems(99, 4).map((i) => i.page || i.type)).toEqual([1, 2, 3, 4])
  })

  it('formatActivityDetail cleans lead rows and moves email to secondary', () => {
    expect(
      formatActivityDetail({
        description:
          'Added lead Jane [jane@studio.com] via form_submission (formID: 64abcf64abcf64abcf64abcf)',
      }),
    ).toEqual({
      primary: 'Added lead Jane via form submission',
      secondary: 'jane@studio.com',
    })
  })

  it('formatActivityDetail splits stage changes onto a secondary line', () => {
    expect(
      formatActivityDetail({
        description: 'Changed lead stage from New Lead to Booked (rule: Intro booked)',
        metadata: {
          fromStatus: 'new_lead',
          toStatus: 'booked',
          ruleName: 'Intro booked',
        },
      }),
    ).toEqual({
      primary: 'Changed lead stage',
      secondary: 'New Lead → Booked · Rule: Intro booked',
    })

    // Older rows with only the description still format
    expect(
      formatActivityDetail({
        description: 'Changed lead stage from New Lead to Booked (rule: Intro booked)',
      }),
    ).toEqual({
      primary: 'Changed lead stage',
      secondary: 'New Lead → Booked · Rule: Intro booked',
    })
  })

  it('formatActivityDetail leaves plain event sentences alone', () => {
    expect(
      formatActivityDetail({
        description: 'Created calendar event "Ballet Basics"',
      }),
    ).toEqual({
      primary: 'Created calendar event "Ballet Basics"',
      secondary: null,
    })
  })
})
