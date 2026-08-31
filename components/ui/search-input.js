'use client'

import { Search } from 'lucide-react'

/**
 * Shared page-level search bar. Visually matches the search box used inside
 * `SearchableSelect` (same border/background/focus treatment) but sized up
 * for standalone use at the top of list/table pages.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  icon = true,
  inputClassName = '',
  ...props
}) {
  return (
    <div className={['relative', className].join(' ')}>
      {icon && (
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
      )}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[
          'h-9 w-full rounded-lg border border-border bg-background text-[12px] text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50',
          icon ? 'pl-8 pr-3' : 'px-3',
          inputClassName,
        ].join(' ')}
        {...props}
      />
    </div>
  )
}
