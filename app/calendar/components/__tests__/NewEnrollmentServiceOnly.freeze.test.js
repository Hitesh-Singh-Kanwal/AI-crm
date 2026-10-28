import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewEnrollmentPackageInline from '../NewEnrollmentPackageInline'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.startsWith('/api/wallet/')) return { success: true, data: { balance: 1000 } }
      if (url.startsWith('/api/calendar-service')) return { success: true, data: [{ _id: 's1', serviceName: 'Group Class', serviceCode: 'GC', color: '#f00', price: 950 }] }
      return { success: true, data: [] }
    }),
    post: vi.fn(),
  },
}))
vi.mock('@/app/settings/payments/useCardProcessor', () => ({ useCardProcessor: () => ({ ready: true }) }))

it('Service tab: adding a service does not hang, and Wallet shows on payment', async () => {
  render(<NewEnrollmentPackageInline serviceOnly customerID="c1" onSubmit={vi.fn()} onCancel={() => {}} />)
  fireEvent.click(await screen.findByText(/Select a service to add/))
  fireEvent.click(await screen.findByText('Group Class'))
  await waitFor(() => expect(screen.getByRole('button', { name: /Next: Payment/ })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: /Next: Payment/ }))
  expect(await screen.findByRole('button', { name: 'Wallet' })).toBeInTheDocument()
}, 20000)
