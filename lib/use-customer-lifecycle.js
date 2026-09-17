'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import {
  CUSTOMER_LIFECYCLE_STATUS_META,
  normalizeCustomerLifecycleMeta,
  setCustomerLifecycleStatusCache,
} from '@/lib/customer-lifecycle'

let _cache = null
let _cachePromise = null
const _listeners = new Set()

function fetchFromApi() {
  if (_cache) return Promise.resolve(_cache)
  if (_cachePromise) return _cachePromise
  _cachePromise = api
    .get('/api/customer-lifecycle-automation/catalog')
    .then((res) => {
      _cache = normalizeCustomerLifecycleMeta(res?.data?.lifecycleStatusMeta)
      setCustomerLifecycleStatusCache(_cache)
      _cachePromise = null
      return _cache
    })
    .catch(() => {
      _cachePromise = null
      return CUSTOMER_LIFECYCLE_STATUS_META
    })
  return _cachePromise
}

export function invalidateCustomerLifecycleCache() {
  _cache = null
  _cachePromise = null
  setCustomerLifecycleStatusCache(null)
  _listeners.forEach((fn) => fn())
}

export function useCustomerLifecycleStatuses() {
  const [statuses, setStatuses] = useState(() => _cache ?? CUSTOMER_LIFECYCLE_STATUS_META)
  const [loading, setLoading] = useState(!_cache)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      if (_cache) {
        setStatuses(_cache)
        setLoading(false)
        return
      }
      setLoading(true)
      fetchFromApi().then((result) => {
        if (cancelled) return
        setStatuses(result)
        setLoading(false)
      })
    }
    refresh()
    _listeners.add(refresh)
    return () => {
      cancelled = true
      _listeners.delete(refresh)
    }
  }, [])

  return { statuses, loading }
}
