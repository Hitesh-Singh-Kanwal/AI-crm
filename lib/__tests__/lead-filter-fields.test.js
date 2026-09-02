import { describe, it, expect } from 'vitest'
import {
  foldPseudoDateConditions,
  getLeadReasonOptions,
  buildLeadQueryParams,
} from '../lead-filter-fields'

describe('foldPseudoDateConditions', () => {
  it('folds createdFrom + createdTo into a single createdAt between condition', () => {
    const out = foldPseudoDateConditions([
      { field: 'uploadType', operator: 'eq', value: 'manual' },
      { field: 'createdFrom', operator: 'eq', value: '2026-08-03' },
      { field: 'createdTo', operator: 'eq', value: '2026-09-02' },
    ])
    expect(out).toEqual([
      { field: 'uploadType', operator: 'eq', value: 'manual' },
      { field: 'createdAt', operator: 'between', value: { from: '2026-08-03', to: '2026-09-02' } },
    ])
  })

  it('uses gte / lte when only one bound is present', () => {
    expect(foldPseudoDateConditions([{ field: 'createdFrom', operator: 'eq', value: '2026-08-03' }])).toEqual([
      { field: 'createdAt', operator: 'gte', value: '2026-08-03' },
    ])
    expect(foldPseudoDateConditions([{ field: 'updatedTo', operator: 'eq', value: '2026-09-02' }])).toEqual([
      { field: 'updatedAt', operator: 'lte', value: '2026-09-02' },
    ])
  })

  it('maps withinDays / olderThanDays onto createdAt relative operators', () => {
    expect(foldPseudoDateConditions([{ field: 'withinDays', operator: 'eq', value: '30' }])).toEqual([
      { field: 'createdAt', operator: 'within_days', value: '30' },
    ])
    expect(foldPseudoDateConditions([{ field: 'olderThanDays', operator: 'eq', value: '90' }])).toEqual([
      { field: 'createdAt', operator: 'older_than_days', value: '90' },
    ])
  })

  it('leaves real fields untouched and drops empty pseudo values', () => {
    const conditions = [
      { field: 'stage', operator: 'eq', value: 'new' },
      { field: 'createdFrom', operator: 'eq', value: '' },
    ]
    expect(foldPseudoDateConditions(conditions)).toEqual([{ field: 'stage', operator: 'eq', value: 'new' }])
  })
})

describe('buildLeadQueryParams', () => {
  it('never emits the legacy pseudo-fields in the conditions blob', () => {
    const params = buildLeadQueryParams({
      page: 1,
      limit: 1,
      filters: {
        conditionLogic: 'AND',
        conditions: [
          { field: 'uploadType', operator: 'eq', value: 'manual' },
          { field: 'createdFrom', operator: 'eq', value: '2026-08-03' },
          { field: 'createdTo', operator: 'eq', value: '2026-09-02' },
        ],
      },
    })
    const sent = JSON.parse(params.get('conditions'))
    const fields = sent.map((c) => c.field)
    expect(fields).not.toContain('createdFrom')
    expect(fields).not.toContain('createdTo')
    expect(sent).toContainEqual({ field: 'createdAt', operator: 'between', value: ['2026-08-03', '2026-09-02'] })
  })
})

describe('getLeadReasonOptions', () => {
  it('dedupes reasons that appear more than once (system reason seeded per location)', () => {
    const options = getLeadReasonOptions([
      { reasonCode: 'special_event', name: 'Special Event' },
      { reasonCode: 'special_event', name: 'Special Event' },
      { reasonCode: 'wedding_dance', name: 'Wedding Dance' },
    ])
    expect(options).toEqual([
      { value: 'special_event', label: 'Special Event' },
      { value: 'wedding_dance', label: 'Wedding Dance' },
    ])
  })
})
