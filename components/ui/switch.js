'use client'

import { forwardRef } from 'react'

const Switch = forwardRef(function Switch({ checked, onChange, className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${className} inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${checked ? 'bg-emerald-500' : 'bg-red-400'}`}
      {...props}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
})

export default Switch

