'use client'

import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import { normalizeWorkingLocation } from './locationScope'

/**
 * Shared working-studio picker for AI Messaging + AI Calling tabs.
 * Keeps ?locationID= in sync via onChange → parent setWorkingLocationID.
 */
export default function WorkingStudioPicker({
  workingLocationID = [],
  onWorkingLocationChange,
  className = 'mb-4 max-w-md',
  placeholder = 'Filter by studio…',
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium">Working studio</label>
      <LocationSelector
        value={
          workingLocationID === ALL_BRANCHES_VALUE
            ? ALL_BRANCHES_VALUE
            : Array.isArray(workingLocationID) && workingLocationID.length
              ? workingLocationID[0]
              : null
        }
        onChange={(id) => onWorkingLocationChange?.(normalizeWorkingLocation(id))}
        multiple={false}
        allowAllBranches
        showAllOption={false}
        placeholder={placeholder}
      />
    </div>
  )
}
