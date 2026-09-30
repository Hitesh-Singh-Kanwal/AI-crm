'use client'

import { useEffect } from 'react'

/**
 * Remembers a list page's view state (search, filters, page, pageSize, tab,
 * ...) across browser Back/Forward and same-tab reload, via sessionStorage.
 * Session-scoped by design — a fresh tab starts clean. Scroll position needs
 * no code here: Next.js's App Router restores page scroll on Back/Forward
 * natively, for any list that scrolls with the page body rather than an
 * inner scrollable div.
 *
 * Usage per page:
 *   const [persisted] = useState(() => readPersistedListState(KEY) || {})
 *   const [search, setSearch] = useState(persisted.search || '')
 *   const [currentPage, setCurrentPage] = useState(persisted.currentPage || 1)
 *   ...
 *   // Effects that reset currentPage to 1 whenever a filter changes must
 *   // skip their very first run, or they wipe the restored page on mount:
 *   const skipPageResetRef = useRef(true)
 *   useEffect(() => {
 *     if (skipPageResetRef.current) { skipPageResetRef.current = false; return }
 *     setCurrentPage(1)
 *   }, [search, filters])
 *   ...
 *   usePersistListState(KEY, { search, currentPage, filters })
 */
export function readPersistedListState(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's state object, intentionally not exhaustively tracked by field
export function usePersistListState(key, value) {
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, JSON.stringify(value)])
}
