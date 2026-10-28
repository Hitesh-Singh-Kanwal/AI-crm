import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AssignMembershipForm from '../AssignMembershipForm'

let walletBalance = 0
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.startsWith('/api/wallet/')) return { success: true, data: { balance: walletBalance } }
      if (url.startsWith('/api/membership')) {
        return { success: true, data: [{ _id: 'm1', membershipName: 'Gold', name: 'Gold', price: 100, durationDays: 30, billingType: 'one_time' }] }
      }
      return { success: true, data: [] }
    }),
    post: vi.fn(),
  },
}))
vi.mock('@/app/settings/payments/useCardProcessor', () => ({ useCardProcessor: () => ({ processor: null }) }))

async function renderWithMembership() {
  render(<AssignMembershipForm customerID="c1" onSuccess={() => {}} onCancel={() => {}} />)
  const option = await screen.findByRole('option', { name: /Gold/ })
  fireEvent.change(option.closest('select'), { target: { value: 'm1' } })
}

describe('AssignMembershipForm: Wallet is a payment method', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Wallet beside the other methods, with no separate toggle', async () => {
    walletBalance = 0
    await renderWithMembership()
    expect(await screen.findByRole('button', { name: 'Wallet' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /wallet/i })).toBeNull()
  })

  it('a wallet that covers the price says so; the amount is editable', async () => {
    walletBalance = 150
    await renderWithMembership()
    fireEvent.click(await screen.findByRole('button', { name: 'Wallet' }))
    expect(screen.getByLabelText('From wallet')).toHaveValue(100)
    expect(screen.getByText(/covers this payment/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('From wallet'), { target: { value: '60' } })
    expect(screen.getByText(/Collect the remaining/)).toHaveTextContent('$40.00')
  })

  it('a short wallet pays what it has and asks how to collect the rest', async () => {
    walletBalance = 30
    await renderWithMembership()
    fireEvent.click(await screen.findByRole('button', { name: 'Wallet' }))
    expect(screen.getByLabelText('From wallet')).toHaveValue(30)
    expect(screen.getByText(/Collect the remaining/)).toHaveTextContent('$70.00')
    expect(screen.getByLabelText('Collect the rest by')).toBeInTheDocument()
  })
})
