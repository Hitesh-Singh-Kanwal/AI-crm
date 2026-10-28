import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import api from '@/lib/api'
import { CreateEventPurchaseDialog } from '../EventsPurchases'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.startsWith('/api/wallet/')) return { success: true, data: { balance: 700 } }
      if (url.startsWith('/api/purchase-template')) {
        return {
          success: true,
          data: [{ _id: 't1', name: 'Showcase Halloween', lineItems: [{ name: 'Competition Package', quantity: 1, unitPrice: 1000, discount: 0 }] }],
        }
      }
      return { success: true, data: [] }
    }),
    post: vi.fn(async (url) => {
      if (url === '/api/purchase') return { success: true, data: { _id: 'p1' } }
      return { success: true, data: { plan: { _id: 'plan1' } } }
    }),
  },
}))
vi.mock('@/app/settings/payments/useCardProcessor', () => ({ useCardProcessor: () => ({ provider: null }) }))

// Kaley: $1,000 Showcase Halloween, $700 in her wallet.
async function openToPayment() {
  render(<CreateEventPurchaseDialog open onClose={() => {}} initialCustomerID="kaley" initialCustomerName="Kaley" />)
  const template = await screen.findByRole('option', { name: 'Showcase Halloween' })
  fireEvent.change(template.closest('select'), { target: { value: 't1' } })
  fireEvent.click(screen.getByRole('button', { name: /Next: Payment/ }))
  await screen.findByText('Payment method')
}
const post = (path) => api.post.mock.calls.find(([url]) => url === path)?.[1]
const walletButton = () => screen.getByRole('button', { name: 'Wallet' })

describe('Events & Products: Wallet is a payment method', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Wallet beside Terminal, Cash and the rest — no toggle', async () => {
    await openToPayment()
    expect(walletButton()).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /wallet/i })).toBeNull()
  })

  it('One-time: $700 wallet + $300 by the method picked for the rest', async () => {
    await openToPayment()
    fireEvent.click(walletButton())
    expect(screen.getByLabelText('From wallet')).toHaveValue(700)
    expect(screen.getByLabelText('Collect the rest by')).toHaveValue('cash')
    fireEvent.click(screen.getByRole('button', { name: /Create & record payment/ }))
    await waitFor(() => expect(post('/api/payment')).toBeTruthy())
    expect(post('/api/payment')).toMatchObject({ amount: 1000, walletAmount: 700, method: 'cash' })
  })

  it('Flexible: picking Wallet makes it the $700 initial payment, $300 scheduled', async () => {
    await openToPayment()
    fireEvent.click(screen.getByRole('button', { name: 'Flexible' }))
    fireEvent.change(screen.getAllByDisplayValue('').find((el) => el.type === 'date'), { target: { value: '2026-11-04' } })
    fireEvent.click(walletButton())

    expect(screen.getByLabelText('From wallet')).toHaveValue(700)
    expect(screen.getAllByPlaceholderText('0.00').at(-1)).toHaveValue(300)
    expect(screen.getByText(/covers this payment/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create schedule' }))
    await waitFor(() => expect(post('/api/payment-plan/purchase')).toBeTruthy())
    const { collectNow, billing } = post('/api/payment-plan/purchase')
    expect(collectNow).toBe(true)
    expect(billing.walletAmount).toBe(700)
    expect(billing.customInstallments).toEqual([expect.objectContaining({ amount: 700 }), { dueDate: '2026-11-04', amount: 300 }])
  })

  it('the wallet amount is editable; the rest is collected by cash or cheque on a plan', async () => {
    await openToPayment()
    fireEvent.click(screen.getByRole('button', { name: 'Flexible' }))
    fireEvent.click(walletButton())
    fireEvent.change(screen.getByLabelText('From wallet'), { target: { value: '500' } })
    expect(screen.getByText(/Collect the remaining/)).toHaveTextContent('$200.00')
    const options = [...screen.getByLabelText('Collect the rest by').options].map((o) => o.value)
    expect(options).toEqual(['cash', 'cheque'])
  })

  it('Payment plan: the wallet pays the first installment', async () => {
    await openToPayment()
    fireEvent.click(screen.getByRole('button', { name: 'Payment plan' }))
    fireEvent.click(walletButton())
    expect(screen.getByLabelText('From wallet')).toHaveValue(333.33)
    fireEvent.click(screen.getByRole('button', { name: 'Create payment plan' }))
    await waitFor(() => expect(post('/api/payment-plan/purchase')).toBeTruthy())
    expect(post('/api/payment-plan/purchase').billing).toMatchObject({ walletAmount: 333.33, method: 'cash' })
  })

  it('asking for more than the wallet holds blocks creating it', async () => {
    await openToPayment()
    fireEvent.click(walletButton())
    fireEvent.change(screen.getByLabelText('From wallet'), { target: { value: '900' } })
    expect(screen.getByText('More than the wallet holds.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create & record payment/ })).toBeDisabled()
  })
})
