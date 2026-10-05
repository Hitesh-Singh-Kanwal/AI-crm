import { describe, it, expect } from 'vitest'
import {
  ALL_CUSTOMER_FILTER_FIELDS,
  CUSTOMER_FILTER_GROUPS,
  getCustomerFilterFieldDef,
  getDefaultOperatorForCustomerField,
  getOperatorsForCustomerFilterField,
} from '@/lib/customer-list-filter-catalog'
import { getFieldValueOptions } from '@/lib/customer-filter-fields'
import { getActiveCustomerFilterChips } from '@/lib/customer-active-filter-chips'

const group = CUSTOMER_FILTER_GROUPS.find((g) => g.id === 'events_products')

describe('Events & Products customer filters', () => {
  it('adds a visible Events & Products group, so the panel gets a "Filter by events & products" toggle', () => {
    expect(group).toBeTruthy()
    expect(group.label).toBe('Events & Products')
    expect(group.hiddenInFilter).toBeUndefined()
    expect(group.fields.map((f) => f.value)).toEqual([
      'purchase.hasAny',
      'purchase.totalCount',
      'purchase.name',
      'purchase.eventTypeID',
      'purchase.productID',
      'purchase.itemName',
      'purchase.billingStatus',
      'purchase.purchaseDate',
      'purchase.eventDate',
    ])
  })

  it('every field resolves, has labels and operators the UI can render', () => {
    for (const f of group.fields) {
      expect(getCustomerFilterFieldDef(f.value)).toBe(f)
      expect(f.label).toBeTruthy()
      expect(getOperatorsForCustomerFilterField(f.value).length).toBeGreaterThan(0)
    }
    // no accidental clash with another group's field
    const all = ALL_CUSTOMER_FILTER_FIELDS.map((f) => f.value)
    expect(new Set(all).size).toBe(all.length)
  })

  it('date fields never offer exact-timestamp "On" (it cannot match a stored datetime)', () => {
    for (const v of ['purchase.purchaseDate', 'purchase.eventDate']) {
      const ops = getOperatorsForCustomerFilterField(v).map((o) => o.value)
      expect(ops).not.toContain('eq')
    }
  })

  const eventTypes = [{ _id: 'et1', name: 'Showcase' }, { _id: 'et2', name: 'Recital' }]
  const products = [{ _id: 'p1', name: 'Hair and Makeup' }]

  it('lists event types and products as dropdown options', () => {
    expect(getFieldValueOptions('purchase.eventTypeID', { eventTypes })).toEqual([
      { value: 'et1', label: 'Showcase' },
      { value: 'et2', label: 'Recital' },
    ])
    expect(getFieldValueOptions('purchase.productID', { products })).toEqual([
      { value: 'p1', label: 'Hair and Makeup' },
    ])
    expect(getFieldValueOptions('purchase.billingStatus', {}).map((o) => o.value)).toEqual(['paid', 'partial', 'unpaid'])
  })

  it('applied-filter chips show names, not ids', () => {
    const chips = getActiveCustomerFilterChips(
      {
        conditions: [
          { id: 'a', field: 'purchase.eventTypeID', operator: 'in', value: ['et1'] },
          { id: 'b', field: 'purchase.productID', operator: 'in', value: ['p1'] },
          { id: 'c', field: 'purchase.name', operator: 'contains', value: 'Halloween' },
        ],
      },
      { eventTypes, products },
    ).map((c) => c.label)
    expect(chips[0]).toContain('Showcase')
    expect(chips[0]).not.toContain('et1')
    expect(chips[1]).toContain('Hair and Makeup')
    expect(chips[2]).toContain('Halloween')
  })
})

describe('Events & Products pick-lists', () => {
  const name = getCustomerFilterFieldDef('purchase.name')
  const item = getCustomerFilterFieldDef('purchase.itemName')

  it('purchase name and item name offer a pick-list, with partial matching still allowed', () => {
    for (const def of [name, item]) {
      expect(def.inputType).toBe('select')
      expect(def.allowTextSearch).toBe(true)
      const ops = getOperatorsForCustomerFilterField(def.value).map((o) => o.value)
      expect(getDefaultOperatorForCustomerField(def.value)).toBe('in') // opens on the pick-list, not a blank text box
      expect(ops).toEqual(expect.arrayContaining(['in', 'not_in', 'eq', 'contains', 'starts_with']))
    }
  })

  it('lists the existing purchase names and item names as options', () => {
    const ctx = { purchaseNames: ['Mini Match', 'Showcase Halloween'], purchaseItemNames: ['Hair and Makeup'] }
    expect(getFieldValueOptions('purchase.name', ctx)).toEqual([
      { value: 'Mini Match', label: 'Mini Match' },
      { value: 'Showcase Halloween', label: 'Showcase Halloween' },
    ])
    expect(getFieldValueOptions('purchase.itemName', ctx)).toEqual([{ value: 'Hair and Makeup', label: 'Hair and Makeup' }])
  })

  it('chips show the picked names', () => {
    const chips = getActiveCustomerFilterChips({
      conditions: [{ id: 'a', field: 'purchase.name', operator: 'in', value: ['Showcase Halloween', 'Mini Match'] }],
    }).map((c) => c.label)
    expect(chips[0]).toContain('Showcase Halloween')
    expect(chips[0]).toContain('Mini Match')
  })
})
