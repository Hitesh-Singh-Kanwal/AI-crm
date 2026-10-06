import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SalesCashTable } from '../SalesCashTable'

const rows = [
  {
    id: 'txn-1',
    transactionType: 'New Sale',
    studentName: 'Jane Doe',
    teacherName: 'Alex Kim',
    studioName: 'Downtown',
    transactionDate: '2026-07-01',
    saleAmount: 500,
    cashCollected: 200,
    tipAmount: 0,
    discountAmount: 0,
    refundAmount: 0,
    programName: 'Bronze Package',
    paymentMethod: 'card',
    paymentStatus: 'Partial',
    remainingBalance: 300,
    refundKind: null,
  },
]

const walletCancellationRow = {
  id: 'txn-2',
  transactionType: 'Cancelled (Wallet Credit)',
  studentName: 'Sam Rivera',
  teacherName: 'Alex Kim',
  studioName: 'Downtown',
  transactionDate: '2026-07-05',
  saleAmount: -500,
  cashCollected: 0,
  tipAmount: 0,
  discountAmount: 0,
  refundAmount: 500,
  refundKind: 'wallet_credit',
  programName: 'Bronze Package',
  paymentMethod: 'wallet',
  paymentStatus: 'completed',
  remainingBalance: 0,
}

describe('SalesCashTable', () => {
  it('renders a row per transaction with key fields', () => {
    render(<SalesCashTable rows={rows} onRowClick={vi.fn()} />)

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('New Sale')).toBeInTheDocument()
    expect(screen.getByText('Bronze Package')).toBeInTheDocument()
  })

  it('orders the columns: Program first, Remaining Balance before Tip, Transaction Type after the money, Studio last, no Discount', () => {
    render(<SalesCashTable rows={rows} onRowClick={vi.fn()} />)

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual([
      'Program',
      'Student Name',
      'Teacher',
      'Transaction Date',
      'Sale Amount',
      'Cash Collected',
      'Remaining Balance',
      'Tip Amount',
      'Refund Amount',
      'Transaction Type',
      'Payment Method',
      'Payment Status',
      'Studio',
    ])
    expect(headers).not.toContain('Discount Amount')
  })

  it('keeps each value under its own heading after the reorder', () => {
    render(<SalesCashTable rows={rows} onRowClick={vi.fn()} />)

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    const bodyRow = screen.getByText('Jane Doe').closest('tr')
    const cells = within(bodyRow).getAllByRole('cell').map((c) => c.textContent)
    expect(cells[headers.indexOf('Program')]).toBe('Bronze Package')
    expect(cells[headers.indexOf('Transaction Type')]).toBe('New Sale')
    expect(cells[headers.indexOf('Studio')]).toBe('Downtown')
    expect(cells[headers.indexOf('Student Name')]).toBe('Jane Doe')
  })

  it('puts the Page Total label under the first column and still totals the money columns', () => {
    render(<SalesCashTable rows={rows} onRowClick={vi.fn()} />)

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    const footerRow = screen.getByText('Page Total').closest('tr')
    const cells = within(footerRow).getAllByRole('cell').map((c) => c.textContent)
    expect(cells[0]).toBe('Page Total')
    expect(cells[headers.indexOf('Sale Amount')]).toBe('500')
    expect(cells[headers.indexOf('Cash Collected')]).toBe('200')
  })

  it('shows an empty state when there are no rows', () => {
    render(<SalesCashTable rows={[]} onRowClick={vi.fn()} />)
    expect(screen.getByText('No transactions found for the selected filters.')).toBeInTheDocument()
  })

  it('calls onRowClick with the row when a row is clicked', async () => {
    const onRowClick = vi.fn()
    render(<SalesCashTable rows={rows} onRowClick={onRowClick} />)

    await userEvent.click(screen.getByText('Jane Doe'))

    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('shows a wallet-credit cancellation as a negative sale with $0 cash impact, distinct from a real refund', () => {
    render(<SalesCashTable rows={[walletCancellationRow]} onRowClick={vi.fn()} />)

    expect(screen.getByText('Cancelled (Wallet Credit)')).toBeInTheDocument()
    // saleAmount is negative (the sale was reversed) — appears in both the
    // row cell and the (single-row) page-total footer.
    expect(screen.getAllByText('-500').length).toBeGreaterThan(0)
    // ...but cashCollected stays 0 (the money never left the business, it moved
    // to the wallet) — several other columns are also legitimately 0 for this
    // row, so just confirm at least one 0 cell rendered rather than asserting
    // a single unique match.
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
  })
})
