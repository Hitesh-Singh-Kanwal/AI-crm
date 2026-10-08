import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SavedListsPanel from '../SavedListsPanel'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn() } }))
vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), delete: vi.fn() } }))
import api from '@/lib/api'

const lists = [
  { _id: 'l1', name: 'Wedding Couples', entityType: 'lead', memberCount: 2 },
  { _id: 'l2', name: 'Recent Active', entityType: 'lead', memberCount: 5 },
]

describe('SavedListsPanel delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.get.mockImplementation((url) =>
      Promise.resolve(url.startsWith('/api/dynamic-list') ? { success: true, data: { lists } } : { success: true, data: [] }),
    )
  })

  it('deletes a list after confirming and removes it from the panel', async () => {
    api.delete.mockResolvedValue({ success: true })
    render(<SavedListsPanel entityType="lead" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Wedding Couples' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Wedding Couples')).not.toBeInTheDocument())
    expect(api.delete).toHaveBeenCalledWith('/api/dynamic-list/l1')
    expect(screen.getByText('Recent Active')).toBeInTheDocument()
  })

  it('keeps the list and shows the error when the delete fails', async () => {
    api.delete.mockResolvedValue({ success: false, error: 'Not allowed' })
    render(<SavedListsPanel entityType="lead" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Wedding Couples' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Not allowed')).toBeInTheDocument()
    expect(screen.getByText('Wedding Couples')).toBeInTheDocument()
  })
})
