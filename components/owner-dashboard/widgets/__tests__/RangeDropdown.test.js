import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RangeDropdown from '../RangeDropdown'

describe('RangeDropdown', () => {
  it('shows "Today" when the page range is Today, not a different preset', () => {
    render(<RangeDropdown value={0} onChange={() => {}} />)
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Today')
  })

  it('lets a widget switch to Today and reports it as 0', () => {
    const onChange = vi.fn()
    render(<RangeDropdown value={30} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '0' } })
    expect(onChange).toHaveBeenCalledWith(0)
  })
})
