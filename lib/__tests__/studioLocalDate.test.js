import { describe, it, expect } from 'vitest'
import { formatStudioDate, formatStudioTime } from '../studioLocalDate'

// A booking stored as 2026-08-14T22:00:00Z is 6:00 PM in New York and 3:00 PM in
// Los Angeles. Formatting without an explicit timeZone renders whatever zone the
// viewer's browser is in, which is what made the appointments sidebar disagree
// with the calendar for the same lesson.
const LESSON_UTC = '2026-08-14T22:00:00.000Z'

describe('formatStudioTime', () => {
  it('renders the studio wall clock, not the viewer zone', () => {
    expect(formatStudioTime(LESSON_UTC, 'America/New_York')).toBe('6:00 PM')
    expect(formatStudioTime(LESSON_UTC, 'America/Los_Angeles')).toBe('3:00 PM')
    expect(formatStudioTime(LESSON_UTC, 'America/Chicago')).toBe('5:00 PM')
  })

  it('handles empty and invalid input without throwing', () => {
    expect(formatStudioTime(null, 'America/New_York')).toBe('—')
    expect(formatStudioTime('', 'America/New_York')).toBe('—')
    expect(formatStudioTime('not-a-date', 'America/New_York')).toBe('—')
  })

  it('falls back to browser-local when the timezone has not loaded yet', () => {
    expect(formatStudioTime(LESSON_UTC, null)).toEqual(expect.any(String))
  })
})

describe('formatStudioDate', () => {
  it('keeps the studio calendar day across a zone boundary', () => {
    // 2026-08-15T02:00Z is still Aug 14 in every US zone.
    const lateNight = '2026-08-15T02:00:00.000Z'
    expect(formatStudioDate(lateNight, 'America/New_York')).toBe('Fri, Aug 14')
    expect(formatStudioDate(lateNight, 'America/Los_Angeles')).toBe('Fri, Aug 14')
  })

  it('accepts option overrides such as year', () => {
    expect(formatStudioDate(LESSON_UTC, 'America/New_York', { year: 'numeric' })).toBe(
      'Fri, Aug 14, 2026',
    )
  })

  it('handles empty and invalid input without throwing', () => {
    expect(formatStudioDate(null, 'America/New_York')).toBe('—')
    expect(formatStudioDate('not-a-date', 'America/New_York')).toBe('—')
  })
})
