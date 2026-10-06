import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AiTokenUsageWidget from '../AiTokenUsageWidget'

const usage = {
  totalTokens: 3_717_511,
  inputTokens: 3_682_723,
  outputTokens: 34_788,
  costUsd: 4.3787,
  recordedCostUsd: 1.5297,
  estimatedCostUsd: 2.849,
  channels: [
    { channel: 'Voice calls (Vapi)', basis: 'recorded', uses: 9, totalTokens: 1_330_009, costUsd: 1.5297 },
    { channel: 'Text agent (SMS replies)', basis: 'estimated', uses: 129, totalTokens: 2_138_262, costUsd: 2.808 },
    { channel: 'Intent & name classifiers', basis: 'estimated', uses: 402, totalTokens: 249_240, costUsd: 0.004 },
  ],
  byModel: [
    { model: 'gpt-5.6-terra', channel: 'Text agent (SMS replies)', basis: 'estimated', inputTokens: 1, outputTokens: 1, costUsd: 2.808, priceAssumed: true },
    { model: 'gpt-4.1', channel: 'Voice calls (Vapi)', basis: 'recorded', inputTokens: 1, outputTokens: 1, costUsd: 1.4892, priceAssumed: false },
  ],
}

describe('AiTokenUsageWidget', () => {
  it('shows the dollar value, token totals, and labels each source as recorded or estimated', () => {
    render(<AiTokenUsageWidget aiTokenUsage={usage} />)

    expect(screen.getByText('≈ $4.38')).toBeInTheDocument()
    expect(screen.getByText('3.72M')).toBeInTheDocument()
    expect(screen.getByText('Recorded')).toBeInTheDocument()
    expect(screen.getAllByText('Estimated')).toHaveLength(2)
    // A sub-cent row stays visible instead of rounding to $0.00.
    expect(screen.getByText('<$0.01')).toBeInTheDocument()
    // Assumed per-token rates are starred and explained.
    expect(screen.getByText(/gpt-5\.6-terra\*/)).toBeInTheDocument()
    expect(screen.getByText(/assumed per-token rate/)).toBeInTheDocument()
  })

  it('shows an empty state when there was no AI usage', () => {
    render(<AiTokenUsageWidget aiTokenUsage={{ totalTokens: 0, channels: [], byModel: [] }} />)
    expect(screen.getByText('No AI usage this period.')).toBeInTheDocument()
  })
})
