import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BarChart, Bar, XAxis } from 'recharts'
import {
  BAR_GRADIENT_DEFS,
  BAR_FILL,
  BAR_FILL_SOFT,
  BAR_GRADIENT_ID,
  BAR_GRADIENT_SOFT_ID,
} from '@/components/charts/barGradients'

// The regression: a custom component wrapping <defs> is dropped by recharts,
// so bars referencing url(#...) render invisible. Assert the defs survive.
function Chart({ defs }) {
  return (
    <BarChart width={600} height={300} data={[{ x: '1st', sent: 29, reply: 16 }]}>
      {defs}
      <XAxis dataKey="x" />
      <Bar dataKey="sent" fill={BAR_FILL_SOFT} isAnimationActive={false} />
      <Bar dataKey="reply" fill={BAR_FILL} isAnimationActive={false} />
    </BarChart>
  )
}

function WrapperDefs() {
  return BAR_GRADIENT_DEFS
}

describe('bar gradient defs', () => {
  it('renders both gradients and every bar fill resolves', () => {
    const { container } = render(<Chart defs={BAR_GRADIENT_DEFS} />)
    const ids = [...container.querySelectorAll('linearGradient')].map((n) => n.id)
    expect(ids).toContain(BAR_GRADIENT_ID)
    expect(ids).toContain(BAR_GRADIENT_SOFT_ID)

    const fills = [...container.querySelectorAll('[fill^="url("]')].map((n) =>
      n.getAttribute('fill').slice(5, -1),
    )
    expect(fills.length).toBeGreaterThan(0)
    for (const f of fills) expect(ids).toContain(f)
  })

  it('confirms the old component-wrapper form is dropped by recharts', () => {
    const { container } = render(<Chart defs={<WrapperDefs />} />)
    expect(container.querySelectorAll('linearGradient')).toHaveLength(0)
  })
})
