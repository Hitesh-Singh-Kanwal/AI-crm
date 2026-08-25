import { describe, it, expect } from 'vitest'
import { groupReportRowsByStudio } from '../groupRowsByLocation'

describe('groupReportRowsByStudio', () => {
  it('returns null for an empty or missing rows array', () => {
    expect(groupReportRowsByStudio([])).toBeNull()
    expect(groupReportRowsByStudio(undefined)).toBeNull()
  })

  it('returns null when every row belongs to the same studio', () => {
    const rows = [{ id: 1, studioName: 'Downtown' }, { id: 2, studioName: 'Downtown' }]
    expect(groupReportRowsByStudio(rows)).toBeNull()
  })

  it('returns null when rows carry no studioName at all', () => {
    const rows = [{ id: 1 }, { id: 2 }]
    expect(groupReportRowsByStudio(rows)).toBeNull()
  })

  it('groups rows by studioName, sorted alphabetically', () => {
    const rows = [
      { id: 1, studioName: 'Uptown' },
      { id: 2, studioName: 'Downtown' },
      { id: 3, studioName: 'Uptown' },
    ]
    const groups = groupReportRowsByStudio(rows)
    expect(groups).toEqual([
      { studioName: 'Downtown', rows: [{ id: 2, studioName: 'Downtown' }] },
      { studioName: 'Uptown', rows: [{ id: 1, studioName: 'Uptown' }, { id: 3, studioName: 'Uptown' }] },
    ])
  })
})
