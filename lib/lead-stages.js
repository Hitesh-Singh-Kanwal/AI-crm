'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

/**
 * Static fallback list — used as the initial value and for SSR-safe code paths.
 * Once useLeadStages() resolves from the API, org-specific statuses take over.
 */
export const LEAD_STAGE_VALUES = [
  'new',
  'engaged',
  'cold',
  'booked',
  'converted',
  'no_show',
  'qualified',
  'disqualified',
  'human intervention',
  'pending_payment',
  'needs_reschedule',
  'rescheduled',
  'declined',
  'no_sale',
  'dormant',
]

/** @deprecated Prefer useLeadStages() — kept as an alias for existing imports. */
export const STAGE_OPTIONS = LEAD_STAGE_VALUES

/** @deprecated Prefer useLeadStages() — kept as an alias for existing imports. */
export const LEAD_STAGE_OPTIONS = LEAD_STAGE_VALUES

/** @deprecated Prefer useLeadStages() — kept as an alias for existing imports. */
export const CAMPAIGN_LEAD_STAGE_OPTIONS = LEAD_STAGE_VALUES

/**
 * Display label for a stage key.
 * Prefers the org name from a stages array; falls back to title-casing the key.
 * This means orphaned legacy keys (e.g. "actualized") still render gracefully.
 */
export function formatLeadStageLabel(value, stages) {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (!str) return ''
  if (Array.isArray(stages)) {
    const match = stages.find((s) => s.key === str || s.value === str)
    if (match?.name) return match.name
  }
  return str
    .replace(/[_-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Returns static dropdown options from LEAD_STAGE_VALUES.
 * @deprecated Use useLeadStages() for org-specific options.
 */
export function getLeadStageOptions() {
  return LEAD_STAGE_VALUES.map((value) => ({
    value,
    label: formatLeadStageLabel(value),
  }))
}

// Module-level cache so multiple hooks on the same page share one fetch.
let _cache = null
let _cachePromise = null

function fetchFromApi() {
  if (_cache) return Promise.resolve(_cache)
  if (_cachePromise) return _cachePromise
  _cachePromise = api
    .get('/api/lead-status?active=true')
    .then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        _cache = res.data.map((s) => ({
          value: s.key,
          label: s.name,
          key: s.key,
          name: s.name,
          color: s.color,
          description: s.description,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
          isDefault: s.isDefault,
        }))
      } else {
        _cache = LEAD_STAGE_VALUES.map((v) => ({ value: v, label: formatLeadStageLabel(v), key: v, name: formatLeadStageLabel(v) }))
      }
      _cachePromise = null
      return _cache
    })
    .catch(() => {
      _cachePromise = null
      return LEAD_STAGE_VALUES.map((v) => ({ value: v, label: formatLeadStageLabel(v), key: v, name: formatLeadStageLabel(v) }))
    })
  return _cachePromise
}

/**
 * Invalidate the lead stage cache (call after creating/updating/deleting a status).
 */
export function invalidateLeadStagesCache() {
  _cache = null
  _cachePromise = null
}

/**
 * React hook that returns org-specific lead stage options.
 * Returns `{ stages, loading }` where stages is `{ value, label, key, name, color, ... }[]`.
 * Falls back to LEAD_STAGE_VALUES on error or during SSR.
 */
export function useLeadStages() {
  const [stages, setStages] = useState(() =>
    _cache ?? LEAD_STAGE_VALUES.map((v) => ({ value: v, label: formatLeadStageLabel(v), key: v, name: formatLeadStageLabel(v) }))
  )
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) {
      setStages(_cache)
      setLoading(false)
      return
    }
    setLoading(true)
    fetchFromApi().then((result) => {
      setStages(result)
      setLoading(false)
    })
  }, [])

  return { stages, loading }
}
