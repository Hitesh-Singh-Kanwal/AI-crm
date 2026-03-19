'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import './PhoneNumberInput.css'

// Dynamic import to avoid SSR issues (library uses window/browser APIs and flag images)
const PhoneInput = dynamic(
  () => import('react-phone-input-pro').then((mod) => mod.default),
  { ssr: false }
)

/**
 * Phone number input with searchable country code selector.
 * Outputs E.164 format: +918287032815
 */
export default function PhoneNumberInput({
  value = '',
  onChange,
  placeholder = 'Enter phone number',
  disabled = false,
  className = '',
}) {
  const handleChange = (rawValue) => {
    if (!rawValue) {
      onChange?.('')
      return
    }
    // Ensure E.164 format: +{digits}
    const digits = String(rawValue).replace(/\D/g, '')
    onChange?.(digits ? `+${digits}` : '')
  }

  // react-phone-input-pro expects value without + for initial display when it includes dial code
  const displayValue = value && value.startsWith('+') ? value.slice(1) : value

  return (
    <div className={cn('phone-input-wrapper', className)}>
      <PhoneInput
        value={displayValue}
        onchange={handleChange}
        initialFormat
        prefix
        includeDialingCode
        searchOption
        defaultCountry="IND"
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}
