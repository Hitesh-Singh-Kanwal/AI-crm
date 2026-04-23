'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import api from '@/lib/api'
import { toast } from '@/components/ui/toast'
import GlobalLoader from '@/components/shared/GlobalLoader'
import LocationSelector from '@/components/shared/LocationSelector'

function randomColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
}

const DISCOUNT_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed', label: 'Fixed ($)' },
]

function emptyService() {
  return {
    _id: `new-${Date.now()}-${Math.random()}`,
    serviceName: '',
    serviceCode: '',
    serviceDetails: '',
    numberOfSessions: '',
    pricePerSession: '',
    total: 0,
    discountType: 'none',
    discountAmount: '',
    finalAmount: 0,
  }
}

function computeAmounts(svc) {
  const sessions = Number(svc.numberOfSessions) || 0
  const price = Number(svc.pricePerSession) || 0
  const total = sessions * price
  const discount = Number(svc.discountAmount) || 0
  let finalAmount = total
  if (svc.discountType === 'percentage') finalAmount = total - (total * discount) / 100
  else if (svc.discountType === 'fixed') finalAmount = total - discount
  return { total, finalAmount: Math.max(0, finalAmount) }
}

function fmt(n) {
  return typeof n === 'number' ? n.toFixed(2) : '0.00'
}

export default function PackageEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const [packageName, setPackageName] = useState('')
  const [locationID, setLocationID] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('')
  const [color, setColor] = useState(() => randomColor())
  const [totalDays, setTotalDays] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [services, setServices] = useState([emptyService()])

  const loadPackage = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api.get(`/api/package/${id}`)
      if (result.success) {
        const pkg = result.data
        setPackageName(pkg.packageName || '')
        setLocationID(pkg.locationID?._id || pkg.locationID || '')
        setDescription(pkg.description || '')
        setSortOrder(pkg.sortOrder ?? '')
        setColor(pkg.color || randomColor())
        setTotalDays(pkg.totalDays ?? '')
        setIsActive(pkg.isActive !== false)
        setServices(
          pkg.services?.length > 0
            ? pkg.services.map((s) => ({ ...s, _id: s._id || `svc-${Math.random()}` }))
            : [emptyService()]
        )
      } else {
        toast.error('Failed to load package', { description: result.error })
        router.push('/calendar/packages')
      }
    } catch {
      toast.error('Error', { description: 'Unable to load package' })
      router.push('/calendar/packages')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    if (!isNew) loadPackage()
  }, [isNew, loadPackage])

  function updateService(index, field, value) {
    setServices((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addService() {
    setServices((prev) => [...prev, emptyService()])
  }

  function removeService(index) {
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!packageName.trim()) {
      toast.error('Package name is required')
      return
    }

    const cleanedServices = services
      .filter((s) => s.serviceName.trim())
      .map((s) => {
        const { total, finalAmount } = computeAmounts(s)
        return {
          ...(String(s._id).startsWith('new-') || String(s._id).startsWith('svc-') ? {} : { _id: s._id }),
          serviceName: s.serviceName.trim(),
          serviceCode: s.serviceCode?.trim() || '',
          serviceDetails: s.serviceDetails?.trim() || '',
          numberOfSessions: Number(s.numberOfSessions) || 0,
          pricePerSession: Number(s.pricePerSession) || 0,
          total,
          discountType: s.discountType || 'none',
          discountAmount: Number(s.discountAmount) || 0,
          finalAmount,
        }
      })

    const payload = {
      packageName: packageName.trim(),
      locationID: locationID || undefined,
      description: description.trim() || undefined,
      sortOrder: sortOrder === '' ? 0 : Number(sortOrder),
      color,
      totalDays: totalDays === '' ? 0 : Number(totalDays),
      isActive,
      services: cleanedServices,
    }

    setSaving(true)
    try {
      const result = isNew
        ? await api.post('/api/package', payload)
        : await api.put(`/api/package/${id}`, payload)

      if (result.success) {
        toast.success(isNew ? 'Package created' : 'Package saved')
        router.push('/calendar/packages')
      } else {
        toast.error('Failed to save', { description: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout title="Package" subtitle="">
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <GlobalLoader variant="center" size="md" text="Loading package…" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={isNew ? 'New Package' : 'Edit Package'} subtitle="">
      <div className="max-w-[1100px] mx-auto pb-12">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/calendar/packages')}
              className="h-9 w-9 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted/50 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {isNew ? 'New Package' : packageName || 'Edit Package'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isNew ? 'Fill in the details below' : 'Update package details and services'}
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 rounded-lg bg-brand hover:bg-brand-dark text-brand-foreground text-sm font-medium gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : isNew ? 'Create Package' : 'Save Changes'}
          </Button>
        </div>

        {/* Package details card */}
        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Package Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pkg-name">Package Name *</Label>
              <Input
                id="pkg-name"
                placeholder="e.g. Beginner Bundle"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Location</Label>
              <LocationSelector value={locationID} onChange={setLocationID} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pkg-order">Sort Order</Label>
              <Input
                id="pkg-order"
                type="number"
                min="0"
                placeholder="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-16 cursor-pointer rounded-md border border-border bg-background p-0.5"
                />
                <span className="text-sm font-mono text-muted-foreground">{color}</span>
                <button
                  type="button"
                  onClick={() => setColor(randomColor())}
                  className="text-xs text-brand hover:text-brand-dark font-medium"
                >
                  Randomise
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-4">
            <Label htmlFor="pkg-desc">Description</Label>
            <Textarea
              id="pkg-desc"
              placeholder="Optional description…"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
        </div>

        {/* Services card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Services
              <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground">
                {services.length}
              </span>
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addService}
              className="h-8 px-3 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Service
            </Button>
          </div>

          {services.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              No services yet. Click "Add Service" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Service Name *</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Code</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Details</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Sessions</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Price/Session</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Total</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Discount</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Disc. Amt</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Final Amt</th>
                    <th className="py-2.5 px-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap w-10" />
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc, idx) => {
                    const { total, finalAmount } = computeAmounts(svc)
                    return (
                      <tr key={svc._id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Service name"
                            value={svc.serviceName}
                            onChange={(e) => updateService(idx, 'serviceName', e.target.value)}
                            className="h-8 text-sm min-w-[130px]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Code"
                            value={svc.serviceCode}
                            onChange={(e) => updateService(idx, 'serviceCode', e.target.value)}
                            className="h-8 text-sm w-[80px]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            placeholder="Details"
                            value={svc.serviceDetails}
                            onChange={(e) => updateService(idx, 'serviceDetails', e.target.value)}
                            className="h-8 text-sm min-w-[120px]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={svc.numberOfSessions}
                            onChange={(e) => updateService(idx, 'numberOfSessions', e.target.value)}
                            className="h-8 text-sm w-[72px]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={svc.pricePerSession}
                              onChange={(e) => updateService(idx, 'pricePerSession', e.target.value)}
                              className="h-8 text-sm pl-5 w-[90px]"
                            />
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="h-8 px-2.5 flex items-center rounded-md bg-muted/50 border border-border text-sm text-foreground w-[80px] font-medium">
                            ${fmt(total)}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={svc.discountType}
                            onChange={(e) => updateService(idx, 'discountType', e.target.value)}
                            className="h-8 rounded-md border border-border bg-background text-sm px-2 focus:outline-none focus:ring-2 focus:ring-brand/30 w-[110px]"
                          >
                            {DISCOUNT_TYPES.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={svc.discountAmount}
                            disabled={svc.discountType === 'none'}
                            onChange={(e) => updateService(idx, 'discountAmount', e.target.value)}
                            className="h-8 text-sm w-[80px] disabled:opacity-40"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <div
                            className="h-8 px-2.5 flex items-center rounded-md border text-sm font-semibold w-[80px]"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${color} 12%, hsl(var(--card)))`,
                              borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                              color,
                            }}
                          >
                            ${fmt(finalAmount)}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => removeService(idx)}
                            disabled={services.length === 1}
                            className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Remove service"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary totals */}
          {services.length > 0 && (
            <div className="mt-4 flex justify-end gap-6 text-sm border-t border-border pt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Total (all services):</span>
                <span className="font-semibold text-foreground">
                  ${fmt(services.reduce((acc, s) => acc + computeAmounts(s).total, 0))}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Final Amount:</span>
                <span className="font-bold text-lg" style={{ color }}>
                  ${fmt(services.reduce((acc, s) => acc + computeAmounts(s).finalAmount, 0))}
                </span>
              </div>
            </div>
          )}

          {/* Total Days + Active */}
          <div className="mt-6 pt-4 border-t border-border flex items-center gap-10">
            <div className="flex items-center gap-3">
              <Label htmlFor="pkg-days" className="whitespace-nowrap text-sm">Total Days</Label>
              <Input
                id="pkg-days"
                type="number"
                min="0"
                placeholder="0"
                value={totalDays}
                onChange={(e) => setTotalDays(e.target.value)}
                className="h-8 w-[100px] text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-sm">Active</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="pkg-active"
                    checked={isActive === true}
                    onChange={() => setIsActive(true)}
                    className="accent-brand"
                  />
                  Yes
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="pkg-active"
                    checked={isActive === false}
                    onChange={() => setIsActive(false)}
                    className="accent-brand"
                  />
                  No
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
