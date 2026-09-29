import { describe, expect, it } from 'vitest'
import {
  enumerateGridSlotStarts,
  locationSlotSettings,
  resolveLessonMinutes,
  resolveStudioDayHours,
} from '../studioSlotHours'

const TZ = 'America/New_York'

describe('resolveLessonMinutes', () => {
  it('uses the studio Default Lesson Length', () => {
    expect(resolveLessonMinutes(50)).toBe(50)
    expect(resolveLessonMinutes(60)).toBe(60)
    expect(resolveLessonMinutes('45')).toBe(45)
  })

  it('falls back to 60 when the setting is missing or out of range', () => {
    expect(resolveLessonMinutes(undefined)).toBe(60)
    expect(resolveLessonMinutes(null)).toBe(60)
    expect(resolveLessonMinutes(10)).toBe(60)
    expect(resolveLessonMinutes(200)).toBe(60)
    expect(resolveLessonMinutes(NaN)).toBe(60)
  })
})

describe('resolveStudioDayHours', () => {
  it('uses the agent fallback when operating hours are unset', () => {
    expect(resolveStudioDayHours(undefined, '2026-09-28', TZ)).toEqual({
      closed: false,
      openMin: 9 * 60,
      closeMin: 20 * 60,
    })
    expect(resolveStudioDayHours([], '2026-10-03', TZ)).toEqual({
      closed: false,
      openMin: 9 * 60,
      closeMin: 17 * 60,
    })
    expect(resolveStudioDayHours(null, '2026-09-27', TZ).closed).toBe(true)
  })

  it('treats a missing weekday as closed once hours are saved', () => {
    const hours = [{ day: 1, closed: false, open: 10, close: 18 }]
    expect(resolveStudioDayHours(hours, '2026-09-29', TZ).closed).toBe(true)
    expect(resolveStudioDayHours(hours, '2026-09-28', TZ)).toEqual({
      closed: false,
      openMin: 10 * 60,
      closeMin: 18 * 60,
    })
  })

  it('hides a day marked closed and converts half hours to minutes', () => {
    const hours = [
      { day: 0, closed: true, open: 9, close: 17 },
      { day: 1, closed: false, open: 8.5, close: 20.5 },
    ]
    expect(resolveStudioDayHours(hours, '2026-09-27', TZ).closed).toBe(true)
    expect(resolveStudioDayHours(hours, '2026-09-28', TZ)).toEqual({
      closed: false,
      openMin: 8.5 * 60,
      closeMin: 20.5 * 60,
    })
  })

  it('does not invent a 6am–9pm window before a date is picked', () => {
    expect(resolveStudioDayHours([{ day: 1, open: 10, close: 18 }], '', TZ)).toEqual({
      closed: false,
      openMin: null,
      closeMin: null,
    })
  })
})

describe('enumerateGridSlotStarts', () => {
  it('steps by the lesson length and stops at close', () => {
    const starts = enumerateGridSlotStarts(9 * 60, 50, 12 * 60, [], 50)
    expect(starts.slice(0, 3)).toEqual([9 * 60, 9 * 60 + 50, 9 * 60 + 100])
    expect(starts[starts.length - 1] + 50).toBeLessThanOrEqual(12 * 60)
    expect(starts.every((t, i) => i === 0 || t - starts[i - 1] === 50)).toBe(true)
  })

  it('skips a busy start without shifting the rest of the grid', () => {
    const starts = enumerateGridSlotStarts(
      9 * 60,
      50,
      12 * 60,
      [{ start: 10 * 60, end: 10 * 60 + 20 }],
      50,
    )
    expect(starts).not.toContain(9 * 60 + 50)
    expect(starts).toContain(9 * 60)
    expect(starts).toContain(9 * 60 + 100)
    expect(starts).not.toContain(10 * 60 + 20)
  })

  it('returns no starts on a closed window', () => {
    expect(enumerateGridSlotStarts(0, 60, 0, [], 60)).toEqual([])
  })
})

describe('locationSlotSettings', () => {
  it('normalizes operating hours and timezone from a location document', () => {
    expect(locationSlotSettings(null)).toBeNull()
    expect(
      locationSlotSettings({
        operatingHours: [{ day: 1, open: 9, close: 20 }],
        defaultLessonMinutes: 50,
        timezone: 'America/Chicago',
      }),
    ).toEqual({
      operatingHours: [{ day: 1, open: 9, close: 20 }],
      defaultLessonMinutes: 50,
      timezone: 'America/Chicago',
    })
    expect(locationSlotSettings({}).operatingHours).toEqual([])
  })
})
