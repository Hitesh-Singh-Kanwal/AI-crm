import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/hooks/usePurchaseFilterOptions', () => ({
  usePurchaseFilterOptions: () => ({
    eventTypes: [{ _id: 'et1', name: 'Showcase' }],
    products: [{ _id: 'p1', name: 'Hair and Makeup' }],
    purchaseNames: ['Mini Match', 'Showcase Halloween'],
    purchaseItemNames: ['Entry fee', 'practice'],
  }),
}))
vi.mock('@/lib/lead-stages', async (importOriginal) => ({
  ...(await importOriginal()),
  useLeadStages: () => ({ stages: [] }),
}))

import CatalogConditionValueInput from '@/components/shared/CatalogConditionValueInput'

const renderInput = (field, operator, value) =>
  render(
    <CatalogConditionValueInput entityType="customer" field={field} operator={operator} value={value} onChange={vi.fn()} />,
  )

describe('Events & Products value inputs', () => {
  it('Event / purchase name offers its existing names as a dropdown', async () => {
    renderInput('purchase.name', 'in', [])
    await userEvent.click(screen.getByText('Select one or more'))
    expect(screen.getByText('Mini Match')).toBeInTheDocument()
    expect(screen.getByText('Showcase Halloween')).toBeInTheDocument()
  })

  it('"equals" is a single-choice dropdown of the same names', () => {
    renderInput('purchase.name', 'eq', '')
    const select = screen.getByRole('combobox')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Select value', 'Mini Match', 'Showcase Halloween'])
  })

  it('"contains" stays a free-text box for partial matches', () => {
    renderInput('purchase.name', 'contains', '')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
  })

  it('Product / item name offers its names too, and "starts with" is free text', async () => {
    const { unmount } = renderInput('purchase.itemName', 'in', [])
    await userEvent.click(screen.getByText('Select one or more'))
    expect(screen.getByText('Entry fee')).toBeInTheDocument()
    expect(screen.getByText('practice')).toBeInTheDocument()
    unmount()

    renderInput('purchase.itemName', 'starts_with', '')
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('Event type and Product are dropdowns of names', async () => {
    const { unmount } = renderInput('purchase.eventTypeID', 'in', [])
    await userEvent.click(screen.getByText('Select one or more'))
    expect(screen.getByText('Showcase')).toBeInTheDocument()
    unmount()

    renderInput('purchase.productID', 'eq', '')
    const select = screen.getByRole('combobox')
    expect(Array.from(select.options).map((o) => o.textContent)).toContain('Hair and Makeup')
  })

  it('Purchase payment status is a dropdown', () => {
    renderInput('purchase.billingStatus', 'eq', '')
    const select = screen.getByRole('combobox')
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['Select value', 'Paid', 'Partial', 'Unpaid'])
  })
})
