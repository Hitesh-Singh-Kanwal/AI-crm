'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { api } from '@/lib/api'

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
}

async function fetchPreferences() {
  const res = await api.get('/api/reports/preferences')
  if (!res.success) throw new Error(res.error || 'Failed to load preferences')
  return {
    favorites: Array.isArray(res.data?.favorites) ? res.data.favorites : [],
    savedViews: Array.isArray(res.data?.savedViews) ? res.data.savedViews : [],
  }
}

export function useReportPreferences() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'report-preferences',
    fetchPreferences,
    swrConfig
  )

  const favorites = data?.favorites || []
  const savedViews = data?.savedViews || []

  const persist = useCallback(
    async (next) => {
      const res = await api.put('/api/reports/preferences', next)
      if (!res.success) throw new Error(res.error || 'Failed to save preferences')
      const payload = {
        favorites: Array.isArray(res.data?.favorites) ? res.data.favorites : next.favorites ?? favorites,
        savedViews: Array.isArray(res.data?.savedViews) ? res.data.savedViews : next.savedViews ?? savedViews,
      }
      await mutate(payload, { revalidate: false })
      return payload
    },
    [favorites, savedViews, mutate]
  )

  const toggleFavorite = useCallback(
    async (slug) => {
      const nextFavorites = favorites.includes(slug)
        ? favorites.filter((s) => s !== slug)
        : [...favorites, slug]
      // Optimistic
      await mutate({ favorites: nextFavorites, savedViews }, { revalidate: false })
      try {
        return await persist({ favorites: nextFavorites })
      } catch (err) {
        await mutate()
        throw err
      }
    },
    [favorites, savedViews, mutate, persist]
  )

  const saveView = useCallback(
    async (view) => {
      const without = savedViews.filter((v) => v.id !== view.id)
      const nextViews = [...without, view]
      return persist({ savedViews: nextViews })
    },
    [savedViews, persist]
  )

  const deleteView = useCallback(
    async (viewId) => {
      const nextViews = savedViews.filter((v) => v.id !== viewId)
      return persist({ savedViews: nextViews })
    },
    [savedViews, persist]
  )

  return {
    favorites,
    savedViews,
    isLoading,
    isValidating,
    error,
    mutate,
    toggleFavorite,
    saveView,
    deleteView,
  }
}
