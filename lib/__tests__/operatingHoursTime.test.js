import { describe, it, expect } from 'vitest'
import { formatClock, parseClockInput, snapToMinute, decimalToMinutes } from '@/lib/operatingHoursTime'

describe('parseClockInput', () => {
  it.each([
    ['10:30 AM', 'open', 10.5],
    ['10:30am', 'open', 10.5],
    ['1030', 'open', 10.5],
    ['930p', 'open', 21.5],
    ['9', 'open', 9],
    ['21:15', 'close', 21.25],
    ['8:45 PM', 'close', 20.75],
    ['noon', 'open', 12],
    ['12:00 AM', 'open', 0],
    ['12:00 AM', 'close', 24],
    ['midnight', 'close', 24],
    ['24:00', 'close', 24],
    ['8.30pm', 'close', 20.5],
  ])('parses %s (%s)', (text, role, expected) => {
    expect(parseClockInput(text, role)).toBeCloseTo(expected, 9)
  })

  it('uses the default period for bare 1–12 hours', () => {
    expect(parseClockInput('9:15', 'close', 'PM')).toBeCloseTo(21.25, 9)
    expect(parseClockInput('9:15', 'open', 'AM')).toBeCloseTo(9.25, 9)
    expect(parseClockInput('13:05', 'open', 'AM')).toBeCloseTo(13 + 5 / 60, 9)
  })

  it.each(['', 'abc', '25:00', '10:75', '13pm', '0am', '24:30', '10:3'])('rejects %j', (text) => {
    expect(parseClockInput(text, 'close')).toBeNull()
  })

  it('rejects midnight-end for open and 24:00 for open', () => {
    expect(parseClockInput('24:00', 'open')).toBeNull()
  })
})

describe('formatClock / snapToMinute', () => {
  it('formats any minute', () => {
    expect(formatClock(10.5)).toBe('10:30 AM')
    expect(formatClock(20.75)).toBe('8:45 PM')
    expect(formatClock(0)).toBe('12:00 AM')
    expect(formatClock(24)).toBe('12:00 AM')
    expect(formatClock(12)).toBe('12:00 PM')
  })

  it('round-trips every minute of the day without drift', () => {
    for (let m = 0; m < 24 * 60; m++) {
      const dec = m / 60
      expect(decimalToMinutes(dec)).toBe(m)
      expect(decimalToMinutes(parseClockInput(formatClock(dec), 'open'))).toBe(m)
    }
  })

  it('snapToMinute keeps minutes and falls back on garbage', () => {
    expect(snapToMinute(10 + 7 / 60, 9)).toBeCloseTo(10 + 7 / 60, 9)
    expect(snapToMinute('x', 9)).toBe(9)
  })
})
