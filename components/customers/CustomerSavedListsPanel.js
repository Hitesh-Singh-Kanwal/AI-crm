'use client'

import SavedListsPanel from '@/components/shared/SavedListsPanel'

/** @deprecated Prefer SavedListsPanel with entityType="customer" */
export default function CustomerSavedListsPanel({ refreshKey = 0 }) {
  return <SavedListsPanel entityType="customer" refreshKey={refreshKey} />
}
