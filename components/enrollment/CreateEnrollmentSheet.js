'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import NewEnrollmentPackageInline from '@/app/calendar/components/NewEnrollmentPackageInline'
import api from '@/lib/api'

const SHEET_WIDTH = '640px'

export default function CreateEnrollmentSheet({
  open,
  onClose,
  /** When set, student is fixed and the selector is hidden. */
  customerID: fixedCustomerID = null,
  customerName = '',
  onSuccess,
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedCustomerID, setSelectedCustomerID] = useState('')
  const [teacherOptions, setTeacherOptions] = useState([])
  const [customerOptions, setCustomerOptions] = useState([])
  const [packageTemplates, setPackageTemplates] = useState([])

  const resolvedCustomerID = fixedCustomerID
    ? String(fixedCustomerID)
    : selectedCustomerID

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function loadOptions() {
      setError('')
      const requests = [
        api.get('/api/teacher?limit=200&status=active'),
        api.get('/api/package?limit=200'),
      ]
      if (!fixedCustomerID) {
        requests.splice(1, 0, api.get('/api/customer?limit=200'))
      }

      const results = await Promise.all(requests)
      if (cancelled) return

      let teachersRes
      let customersRes
      let packagesRes

      if (fixedCustomerID) {
        ;[teachersRes, packagesRes] = results
      } else {
        ;[teachersRes, customersRes, packagesRes] = results
      }

      if (teachersRes?.success && Array.isArray(teachersRes.data)) {
        setTeacherOptions(
          teachersRes.data.map((t) => ({
            value: String(t._id ?? t.id),
            label: t.name || t.email || String(t._id),
          })),
        )
      }
      if (customersRes?.success && Array.isArray(customersRes.data)) {
        setCustomerOptions(
          customersRes.data.map((c) => ({
            value: String(c._id ?? c.id),
            label: c.name || c.email || String(c._id),
          })),
        )
      }
      if (packagesRes?.success && Array.isArray(packagesRes.data)) {
        setPackageTemplates(packagesRes.data)
      }
    }

    loadOptions()
    return () => {
      cancelled = true
    }
  }, [open, fixedCustomerID])

  const selectedCustomerLabel = useMemo(() => {
    if (fixedCustomerID && customerName) return customerName
    const opt = customerOptions.find((c) => c.value === selectedCustomerID)
    return opt?.label || ''
  }, [fixedCustomerID, customerName, customerOptions, selectedCustomerID])

  function handleClose() {
    setError('')
    setSelectedCustomerID('')
    onClose?.()
  }

  async function handleCreateEnrollmentAndPackage(payload) {
    if (!resolvedCustomerID) {
      setError('Please select a student.')
      return false
    }

    setError('')
    setSubmitting(true)

    const enrRes = await api.post('/api/enrollment', {
      customerID: resolvedCustomerID,
      label: payload?.label?.trim() || undefined,
      teacherID: payload?.teacherID || undefined,
    })

    if (!enrRes?.success) {
      setError(enrRes?.error || 'Failed to create enrollment.')
      setSubmitting(false)
      return false
    }

    const created =
      enrRes?.data?.enrollment && typeof enrRes.data.enrollment === 'object'
        ? enrRes.data.enrollment
        : enrRes.data
    const enrollmentID = String(created?._id || created?.enrollmentID || '')

    if (!enrollmentID) {
      setError('Enrollment created but ID was not returned.')
      setSubmitting(false)
      return false
    }

    const addRes = await api.post('/api/customer-package/add', {
      customerID: resolvedCustomerID,
      packageID: payload.packageID,
      enrollmentID,
      services: (payload.services || []).map((s) => ({
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        color: s.color,
        numberOfSessions: Number(s.numberOfSessions || 0),
        pricePerSession: Number(s.pricePerSession || 0),
        discountType: s.discountType || 'none',
        discountAmount: Number(s.discountAmount || 0),
        finalAmount: Number(s.finalAmount || 0),
      })),
      billingType: payload.billingType,
      billing:
        payload.billingType === 'one_time'
          ? { method: payload.billing?.method || 'cash' }
          : payload.billingType === 'payment_plan'
            ? {
                numberOfInstallments: Number(payload.billing?.numberOfInstallments || 0),
                frequency: payload.billing?.frequency,
                startDate: payload.billing?.startDate,
              }
            : payload.billingType === 'pay_per_session'
              ? {}
              : {},
      ...(payload.purchaseDate ? { purchaseDate: payload.purchaseDate } : {}),
      ...(payload.tip?.teacherID && payload.tip?.amount
        ? {
            tip: {
              teacherID: payload.tip.teacherID,
              amount: Number(payload.tip.amount),
              method: payload.tip.method || 'cash',
            },
          }
        : {}),
    })

    if (!addRes?.success) {
      setError(addRes?.error || 'Failed to add package to enrollment.')
      setSubmitting(false)
      return false
    }

    setSubmitting(false)
    handleClose()
    onSuccess?.()
    return true
  }

  return (
    <Sheet open={open} onClose={handleClose} width={SHEET_WIDTH}>
      <SheetContent className="flex flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b border-border bg-muted/30 px-5 pt-5 pb-3">
          <p className="text-[14px] font-bold text-foreground">Create Enrollment</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Create enrollment and package in one go.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-border bg-card p-3 mb-0">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Student</p>
            {fixedCustomerID ? (
              <p className="text-[12px] font-medium text-foreground truncate">
                {selectedCustomerLabel || 'Selected student'}
              </p>
            ) : (
              <>
                <div className="relative">
                  <select
                    value={selectedCustomerID}
                    onChange={(e) => setSelectedCustomerID(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] outline-none focus:border-primary"
                  >
                    <option value="">Select student…</option>
                    {customerOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
                {selectedCustomerLabel && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    Selected: {selectedCustomerLabel}
                  </p>
                )}
              </>
            )}
          </div>

          <NewEnrollmentPackageInline
            teacherOptions={teacherOptions}
            packageTemplates={packageTemplates}
            onCancel={handleClose}
            onSubmit={handleCreateEnrollmentAndPackage}
          />

          {error && (
            <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12px] text-destructive">
              {error}
            </div>
          )}
          {submitting && (
            <p className="mt-2 text-[11px] text-muted-foreground">Creating…</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
