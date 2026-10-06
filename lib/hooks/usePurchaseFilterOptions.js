'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { getCurrentUserId } from '@/lib/auth'

const EMPTY = { eventTypes: [], products: [], purchaseNames: [], purchaseItemNames: [] }

// One fetch shared by every filter row, keyed by user so a different account never sees
// another organisation's event types or products.
let cache = { userId: null, value: null, inflight: null }

function load() {
  const userId = getCurrentUserId()
  if (cache.userId !== userId) cache = { userId, value: null, inflight: null }
  if (cache.value) return Promise.resolve(cache.value)
  if (!cache.inflight) {
    const mine = cache
    mine.inflight = Promise.all([
      api.get('/api/event-type?limit=200'),
      api.get('/api/product?limit=200'),
      api.get('/api/purchase/filter-options'),
    ])
      .then(([types, prods, names]) => {
        mine.value = {
          eventTypes: types?.success && Array.isArray(types.data) ? types.data : [],
          products: prods?.success && Array.isArray(prods.data) ? prods.data : [],
          purchaseNames: names?.success && Array.isArray(names.data?.names) ? names.data.names : [],
          purchaseItemNames: names?.success && Array.isArray(names.data?.itemNames) ? names.data.itemNames : [],
        }
        return mine.value
      })
      .catch(() => {
        mine.inflight = null
        return EMPTY
      })
  }
  return cache.inflight
}

/** Event types, products and existing purchase / item names for the "Events & Products" customer filters. */
export function usePurchaseFilterOptions(enabled = true) {
  const [options, setOptions] = useState(
    () => (cache.userId === getCurrentUserId() && cache.value) || EMPTY,
  )

  useEffect(() => {
    if (!enabled) return undefined
    let live = true
    load().then((value) => {
      if (live) setOptions(value)
    })
    return () => {
      live = false
    }
  }, [enabled])

  return options
}
