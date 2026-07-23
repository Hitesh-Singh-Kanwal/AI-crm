'use client'

import { SectionLabel } from '@/components/dashboard/widgets/shared'
import RangeDropdown from './RangeDropdown'

/**
 * Standard owner-dashboard card header: title on the left, any widget-specific
 * badge/legend in the middle, and this widget's own range dropdown on the
 * right. `rangeDays`/`onRangeChange` come from the withOwnRange/withRangeState
 * wrapper in registry.js — omit onRangeChange to hide the dropdown (e.g. Goals,
 * which is calendar-month scoped rather than range scoped).
 */
export default function WidgetHeader({ title, right = null, rangeDays, onRangeChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <SectionLabel>{title}</SectionLabel>
      <div className="flex items-center gap-2">
        {right}
        {onRangeChange && <RangeDropdown value={rangeDays} onChange={onRangeChange} />}
      </div>
    </div>
  )
}
