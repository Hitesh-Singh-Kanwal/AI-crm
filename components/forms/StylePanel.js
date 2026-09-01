'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChevronDown, ChevronUp, Plus, AlignLeft, AlignCenter, AlignRight, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_PHONE_COUNTRY_ISO,
  getPhoneCountryCodeOptions,
} from '@/lib/phone-country-codes'
import { HEADING_LEVELS } from '@/lib/form-heading-styles'
import { getGlobalStyleExcludeKey } from '@/lib/form-global-styles'
import { formatReasonLabel, isSystemLeadReason } from '@/lib/dynamic-list-normalize'

const fontFamilies = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Comic Sans MS',
  'Trebuchet MS',
  'Impact',
  'Lucida Console',
  'Tahoma',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
]

const fontWeights = ['100', '200', '300', '400', '500', '600', '700', '800', '900']

export default function StylePanel({
  field,
  onStyleChange,
  onFieldUpdate,
  onLeadReasonsRefresh,
  leadReasons = [],
  reasonsLocationID = null,
  reasonOptionsBaseline = [],
  globalStyleExcludeKeys = [],
  onToggleGlobalExclude,
}) {
  const toast = useToast()
  const [expandedSections, setExpandedSections] = useState({
    typography: true,
    spacing: true,
    colors: true,
    border: true,
    layout: true,
  })
  const [newReasonName, setNewReasonName] = useState('')
  const [addingReason, setAddingReason] = useState(false)
  const [deletingReasonId, setDeletingReasonId] = useState(null)

  if (!field) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Select a field to edit its settings
      </div>
    )
  }

  const styles = field.styles || {}

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const updateStyle = (key, value) => {
    const updatedStyles = {
      ...styles,
      [key]: value,
    }
    onStyleChange({
      ...field,
      styles: updatedStyles,
    })
  }

  const handleFieldUpdate = (updates) => {
    onFieldUpdate(updates)
  }

  const supportsDefaultValue =
    field.type !== 'submit' &&
    field.type !== 'hidden' &&
    field.type !== 'checkbox' &&
    field.type !== 'rating' &&
    field.type !== 'file' &&
    field.type !== 'heading' &&
    field.type !== 'captcha'

  const defaultValueControls = supportsDefaultValue ? (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      {field.type === 'select' ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Default / submitted value</Label>
          <Select
            value={field.defaultValue || ''}
            onChange={(e) => {
              const nextValue = e.target.value
              handleFieldUpdate({
                ...field,
                defaultValue: nextValue || undefined,
                submitHidden: nextValue ? field.submitHidden : false,
                ...(field.name === 'locationID' ? { studioDefaultSeeded: true } : {}),
              })
            }}
          >
            <option value="">Visitor chooses (visible dropdown)</option>
            {(field.options || []).map((opt, idx) => (
              <option key={opt.value || opt.label || idx} value={opt.value || opt.label}>
                {opt.label || opt.value}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Pick a value to pre-select or submit when the field is hidden.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Default value</Label>
          <Input
            value={field.defaultValue || ''}
            onChange={(e) => {
              const nextValue = e.target.value
              handleFieldUpdate({
                ...field,
                defaultValue: nextValue || undefined,
                submitHidden: nextValue ? field.submitHidden : false,
              })
            }}
            placeholder="Pre-filled value for this field"
            className="border-border bg-background text-sm h-9"
          />
        </div>
      )}

      {(field.type === 'select' ? Boolean(field.defaultValue) : Boolean(field.defaultValue)) ? (
        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id={`submit-hidden-${field.id}`}
            checked={Boolean(field.submitHidden)}
            onChange={(e) =>
              handleFieldUpdate({
                ...field,
                submitHidden: e.target.checked,
              })
            }
            className="mt-0.5"
          />
          <div>
            <Label htmlFor={`submit-hidden-${field.id}`} className="text-xs text-foreground">
              Hide field (submit this value)
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Field stays in the form HTML but is not shown to visitors. The value above is still submitted.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  ) : null

  const handleAddReason = async () => {
    const name = newReasonName.trim()
    if (!name || addingReason) return
    if (!reasonsLocationID) {
      toast.error({
        title: 'Branch required',
        message: 'Select a studio for this form (or in the navbar) before adding a reason.',
      })
      return
    }
    setAddingReason(true)
    try {
      const result = await api.post('/api/lead-reasons', {
        name,
        locationID: reasonsLocationID,
      })
      if (!result.success) {
        toast.error({
          title: 'Could not add reason',
          message: result.error || result.message || 'Please try again.',
        })
        return
      }
      const created = result.data || {}
      const value = created.reasonCode || created._id || created.name || name
      const label = formatReasonLabel(value, leadReasons)
      const existing = Array.isArray(field.options) ? field.options : []
      const already = existing.some(
        (o) => String(o.value).toLowerCase() === String(value).toLowerCase(),
      )
      handleFieldUpdate({
        ...field,
        optionsLocked: false,
        reasonsLocationID,
        options: already
          ? existing
          : [...existing, { label, value }],
      })
      toast.success({ title: 'Reason added', message: `"${label}" is now on this form.` })
      setNewReasonName('')
      if (onLeadReasonsRefresh) {
        await onLeadReasonsRefresh()
      }
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not add reason.' })
    } finally {
      setAddingReason(false)
    }
  }

  const catalogReasonOptions = (leadReasons || []).map((r) => {
    const value = r.reasonCode || r._id || r.name
    return {
      value,
      label: formatReasonLabel(value, leadReasons),
      _id: r._id,
      isSystem: isSystemLeadReason(r),
    }
  })

  /** Selected options (in form order) + unchecked catalog items after them. */
  const reasonPickerRows = (() => {
    const isPlaceholder = (opt) => {
      const value = String(opt?.value ?? '').trim()
      const label = String(opt?.label ?? '').trim()
      if (!value && !label) return true
      const normalized = (value || label).toLowerCase().replace(/\s+/g, ' ')
      return (
        normalized === 'select reason' ||
        normalized === 'select an option' ||
        /^select(\s+\w+)?$/i.test(normalized)
      )
    }
    const byValue = new Map(
      catalogReasonOptions.map((o) => [String(o.value).toLowerCase(), o]),
    )
    const selected = (Array.isArray(field.options) ? field.options : []).filter(
      (o) => !isPlaceholder(o),
    )
    const selectedKeys = new Set(selected.map((o) => String(o.value).toLowerCase()))
    const rows = selected.map((opt) => {
      const key = String(opt.value).toLowerCase()
      const catalog = byValue.get(key)
      return {
        value: opt.value,
        label: formatReasonLabel(opt.value || opt.label, leadReasons),
        selected: true,
        _id: catalog?._id,
        isSystem: catalog ? catalog.isSystem : isSystemLeadReason(opt),
      }
    })
    catalogReasonOptions.forEach((opt) => {
      if (isPlaceholder(opt)) return
      if (selectedKeys.has(String(opt.value).toLowerCase())) return
      rows.push({ ...opt, selected: false })
    })
    return rows
  })()

  const setReasonOptions = (options) => {
    const isPlaceholder = (opt) => {
      const value = String(opt?.value ?? '').trim()
      const label = String(opt?.label ?? '').trim()
      if (!value && !label) return true
      const normalized = (value || label).toLowerCase().replace(/\s+/g, ' ')
      return (
        normalized === 'select reason' ||
        normalized === 'select an option' ||
        /^select(\s+\w+)?$/i.test(normalized)
      )
    }
    const nextOptions = (options || [])
      .filter((o) => !isPlaceholder(o))
      .map((o) => ({
        value: o.value,
        label: formatReasonLabel(o.value || o.label, leadReasons),
      }))
    const values = new Set(nextOptions.map((o) => String(o.value)))
    const nextDefault =
      field.defaultValue != null &&
      field.defaultValue !== '' &&
      values.has(String(field.defaultValue))
        ? field.defaultValue
        : undefined
    handleFieldUpdate({
      ...field,
      optionsLocked: false,
      reasonsLocationID,
      options: nextOptions,
      defaultValue: nextDefault,
      submitHidden: nextDefault ? field.submitHidden : false,
    })
  }

  const toggleReasonSelected = (value, checked) => {
    const key = String(value).toLowerCase()
    const current = Array.isArray(field.options) ? [...field.options] : []
    if (checked) {
      if (current.some((o) => String(o.value).toLowerCase() === key)) return
      const fromCatalog = catalogReasonOptions.find(
        (o) => String(o.value).toLowerCase() === key,
      )
      const fromRow = reasonPickerRows.find((o) => String(o.value).toLowerCase() === key)
      const nextOpt = fromCatalog || fromRow || { value, label: formatReasonLabel(value, leadReasons) }
      setReasonOptions([...current, { value: nextOpt.value, label: nextOpt.label }])
      return
    }
    setReasonOptions(current.filter((o) => String(o.value).toLowerCase() !== key))
  }

  const moveReasonOption = (index, direction) => {
    const options = [...(field.options || [])]
    const target = index + direction
    if (target < 0 || target >= options.length) return
    ;[options[index], options[target]] = [options[target], options[index]]
    setReasonOptions(options)
  }

  const resetReasonOptionsToPrevious = () => {
    const baseline = Array.isArray(reasonOptionsBaseline) ? reasonOptionsBaseline : []
    if (baseline.length > 0) {
      setReasonOptions(baseline)
      toast.success({
        title: 'Options restored',
        message: 'Reason selections and order reset to the previous setup.',
      })
      return
    }
    // New form / no snapshot yet → all catalog reasons selected
    if (catalogReasonOptions.length > 0) {
      setReasonOptions(catalogReasonOptions)
      toast.success({
        title: 'Options restored',
        message: 'All studio reasons selected in catalog order.',
      })
      return
    }
    toast.error({
      title: 'Nothing to restore',
      message: 'No previous reason setup is available for this form yet.',
    })
  }

  const handleDeleteReasonFromCatalog = async (opt) => {
    if (!opt?._id || opt.isSystem || isSystemLeadReason(opt)) {
      toast.error({
        title: 'Cannot delete',
        message: 'Built-in reasons are available for every studio and cannot be deleted.',
      })
      return
    }
    if (
      !window.confirm(
        `Delete "${opt.label}" from this studio's reason list? This cannot be undone.`,
      )
    ) {
      return
    }
    setDeletingReasonId(String(opt._id))
    try {
      const result = await api.delete(`/api/lead-reasons/${opt._id}`)
      if (!result.success) {
        toast.error({
          title: 'Could not delete',
          message: result.error || result.message || 'Please try again.',
        })
        return
      }
      const key = String(opt.value).toLowerCase()
      const current = Array.isArray(field.options) ? field.options : []
      setReasonOptions(current.filter((o) => String(o.value).toLowerCase() !== key))
      toast.success({ title: 'Reason deleted', message: `"${opt.label}" was removed.` })
      if (onLeadReasonsRefresh) await onLeadReasonsRefresh()
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not delete reason.' })
    } finally {
      setDeletingReasonId(null)
    }
  }

  const SectionHeader = ({ title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-xs font-semibold text-foreground hover:text-foreground/90"
    >
      <span>{title}</span>
      {expandedSections[section] ? (
        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  )

  const optionsLocked =
    Boolean(field.locked) ||
    Boolean(field.optionsLocked) ||
    ['locationID', 'utm_source'].includes(field.name)

  const isReasonField = field.name === 'reason'
  // Reason options are form-curated (reorder/remove) — never treat as fully locked.
  const selectOptionsLocked = isReasonField ? false : optionsLocked

  const isLeadProperty =
    field.propertyKind === 'lead' ||
    ['name', 'email', 'phoneNumber', 'locationID', 'reason', 'location', 'utm_source'].includes(
      field.name
    )
  const isMetadataProperty = field.propertyKind === 'metadata' || Boolean(field.metadataKey)

  const internalNameDisplay = isMetadataProperty
    ? `metadata.${field.metadataKey || 'custom'}`
    : field.name || '—'

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
        <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
        <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
        <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-3 mt-0">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">
            {field.type === 'heading' ? 'Heading text' : field.type === 'captcha' ? 'Captcha text' : 'Label'}
          </Label>
          <Input
            value={field.label}
            onChange={(e) => handleFieldUpdate({ ...field, label: e.target.value })}
            className="border-border bg-background text-sm h-9"
          />
        </div>
        {typeof onToggleGlobalExclude === 'function' && field.type !== 'hidden' ? (
          <label className="flex items-start gap-2.5 rounded-md border border-border bg-muted/20 px-2.5 py-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={globalStyleExcludeKeys.includes(getGlobalStyleExcludeKey(field))}
              onChange={(e) =>
                onToggleGlobalExclude(getGlobalStyleExcludeKey(field), e.target.checked)
              }
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-foreground">Exclude from form CSS</span>
              <span className="block text-[11px] text-muted-foreground">
                This field will ignore this form&apos;s shared styles
              </span>
            </span>
          </label>
        ) : null}
        {field.type === 'heading' ? (
          <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Heading level</Label>
              <Select
                value={field.headingLevel || 'h2'}
                onChange={(e) => {
                  const level = e.target.value
                  const meta = HEADING_LEVELS.find((h) => h.value === level)
                  handleFieldUpdate({
                    ...field,
                    headingLevel: level,
                    styles: {
                      ...styles,
                      fontSize: meta?.defaultSize || styles.fontSize || '24px',
                    },
                  })
                }}
                className="border-border bg-background text-sm h-9"
              >
                {HEADING_LEVELS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Position</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'left', label: 'Left', Icon: AlignLeft },
                  { value: 'center', label: 'Middle', Icon: AlignCenter },
                  { value: 'right', label: 'Right', Icon: AlignRight },
                ].map(({ value, label, Icon }) => {
                  const active = (styles.blockAlign || styles.textAlign || 'left') === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        onStyleChange({
                          ...field,
                          styles: {
                            ...styles,
                            textAlign: value,
                            blockAlign: value,
                          },
                        })
                      }}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors',
                        active
                          ? 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
        {field.type !== 'submit' &&
        field.type !== 'heading' &&
        field.type !== 'captcha' &&
        (isLeadProperty || isMetadataProperty || field.name) ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-medium">Internal name</Label>
            {isMetadataProperty ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-xs text-muted-foreground font-mono">metadata.</span>
                  <Input
                    value={field.metadataKey || ''}
                    onChange={(e) => {
                      const metadataKey = e.target.value
                        .replace(/[^\w.-]/g, '_')
                        .replace(/^_+|_+$/g, '')
                      handleFieldUpdate({
                        ...field,
                        metadataKey,
                        name: `metadata.${metadataKey || 'custom'}`,
                      })
                    }}
                    placeholder="custom_key"
                    className="border-border bg-background text-sm h-9 font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Saved on the lead under metadata.
                </p>
              </>
            ) : (
              <>
                <Input
                  value={internalNameDisplay}
                  readOnly
                  disabled
                  className="border-border bg-muted/40 text-sm h-9 font-mono italic"
                />
                <p className="text-[11px] text-muted-foreground">
                  Fixed submit key — renaming the label does not change this.
                </p>
              </>
            )}
          </div>
        ) : null}
        {field.type !== 'submit' && field.type !== 'heading' && field.type !== 'captcha' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Placeholder</Label>
              <Input
                value={field.placeholder}
                onChange={(e) => handleFieldUpdate({ ...field, placeholder: e.target.value })}
                className="border-border bg-background text-sm h-9"
              />
            </div>
            {(field.type === 'phone' || field.name === 'phoneNumber') && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">
                  Default country
                </Label>
                <Select
                  value={`${field.defaultCountryIso || DEFAULT_PHONE_COUNTRY_ISO}|${field.defaultCountryCode || DEFAULT_PHONE_COUNTRY_CODE}`}
                  onChange={(e) => {
                    const [iso, code] = String(e.target.value).split('|')
                    handleFieldUpdate({
                      ...field,
                      defaultCountryCode: code || DEFAULT_PHONE_COUNTRY_CODE,
                      defaultCountryIso: iso || DEFAULT_PHONE_COUNTRY_ISO,
                    })
                  }}
                  className="border-border bg-background text-sm h-9"
                >
                  {getPhoneCountryCodeOptions().map((opt) => (
                    <option key={`${opt.iso}-${opt.code}`} value={`${opt.iso}|${opt.code}`}>
                      {opt.flag} {opt.label}
                    </option>
                  ))}
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Visitors pick a country; number is saved as +code… (e.g. +11234567890)
                </p>
              </div>
            )}
            {(field.type === 'select' || field.type === 'checkbox') && (
              <div className="space-y-2.5">
                <Label className="text-xs text-muted-foreground font-medium">Options</Label>
                {isReasonField ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-muted-foreground">
                      Check reasons to show on this form. Built-in reasons cannot be deleted; custom
                      ones can. Use arrows to set order
                      {reasonsLocationID ? '' : ' — pick a studio first'}.
                    </p>
                    <div className="space-y-1.5 rounded-md border border-border p-2 max-h-64 overflow-y-auto">
                      {reasonPickerRows.length > 0 ? (
                        reasonPickerRows.map((opt) => {
                          const selectedIndex = (field.options || []).findIndex(
                            (o) => String(o.value) === String(opt.value),
                          )
                          const isSelected = selectedIndex >= 0
                          const canDelete =
                            Boolean(opt._id) && !opt.isSystem && !isSystemLeadReason(opt)
                          return (
                            <div
                              key={opt.value || opt.label}
                              className="flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1.5"
                            >
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 shrink-0 rounded border-border"
                                checked={isSelected}
                                onChange={(e) =>
                                  toggleReasonSelected(opt.value, e.target.checked)
                                }
                                aria-label={`Include ${opt.label}`}
                              />
                              <span className="min-w-0 flex-1 text-xs font-medium text-foreground truncate">
                                {opt.label}
                                {opt.isSystem ? (
                                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                                    (built-in)
                                  </span>
                                ) : null}
                              </span>
                              {isSelected ? (
                                <>
                                  <button
                                    type="button"
                                    title="Move up"
                                    disabled={selectedIndex === 0}
                                    onClick={() => moveReasonOption(selectedIndex, -1)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-40"
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Move down"
                                    disabled={
                                      selectedIndex === (field.options || []).length - 1
                                    }
                                    onClick={() => moveReasonOption(selectedIndex, 1)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-40"
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  title="Delete from studio catalog"
                                  disabled={deletingReasonId === String(opt._id)}
                                  onClick={() => handleDeleteReasonFromCatalog(opt)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-destructive disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          )
                        })
                      ) : (
                        <p className="px-1 py-2 text-xs text-muted-foreground">
                          No reasons for this studio yet — add one below.
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={resetReasonOptionsToPrevious}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Reset to previous setup
                    </Button>
                    <div className="space-y-2 rounded-md border border-dashed border-border p-2.5">
                      <Label className="text-xs text-muted-foreground font-medium">
                        Add new reason
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={newReasonName}
                          onChange={(e) => setNewReasonName(e.target.value)}
                          placeholder="e.g. Wedding, Birthday…"
                          disabled={addingReason}
                          className="flex-1 border-border bg-background text-sm h-9"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddReason()
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          onClick={handleAddReason}
                          disabled={addingReason || !newReasonName.trim()}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {addingReason ? 'Adding…' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : selectOptionsLocked ? (
                  <div className="space-y-2.5">
                    {field.name === 'locationID' && (
                      <p className="text-xs text-muted-foreground">
                        Options are loaded from your active studios/locations. The selected value is
                        saved as locationID when the form is submitted.
                      </p>
                    )}
                    {field.name === 'utm_source' && (
                      <p className="text-xs text-muted-foreground">
                        Source options are fixed: Google Ads and Website. Saved as utm_source.
                      </p>
                    )}
                    <ul className="text-xs text-muted-foreground space-y-1 rounded-md border border-border p-2 max-h-36 overflow-y-auto">
                      {(field.options || []).length > 0 ? (
                        field.options.map((opt, idx) => (
                          <li key={opt.value || opt.label || idx}>{opt.label || opt.value}</li>
                        ))
                      ) : (
                        <li>
                          {field.name === 'locationID'
                            ? 'No studios available'
                            : 'No options available'}
                        </li>
                      )}
                    </ul>
                  </div>
                ) : (
                  <>
                    {(field.options || []).map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          value={opt.label || ''}
                          onChange={(e) => {
                            const newOptions = [...(field.options || [])]
                            const newLabel = e.target.value
                            const derivedValue = (newOptions[idx]?.value && newOptions[idx].value !== (`option_${idx+1}`)) ? newOptions[idx].value : newLabel.toLowerCase().replace(/\s+/g, '_')
                            newOptions[idx] = { ...newOptions[idx], label: newLabel, value: derivedValue }
                            handleFieldUpdate({ ...field, options: newOptions })
                          }}
                          placeholder="Option label"
                          className="flex-1 border-border bg-background text-sm h-9"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = [...(field.options || [])]
                            newOptions.splice(idx, 1)
                            handleFieldUpdate({ ...field, options: newOptions })
                          }}
                          className="px-2 py-1 text-sm rounded bg-destructive/10 text-destructive hover:bg-destructive/15"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const newOptions = [...(field.options || [])]
                          const nextIndex = newOptions.length + 1
                          newOptions.push({ label: `Option ${nextIndex}`, value: `option_${nextIndex}` })
                          handleFieldUpdate({ ...field, options: newOptions })
                        }}
                        className="px-3 py-2 text-sm bg-muted text-foreground rounded"
                      >
                        Add Option
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {defaultValueControls}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="required"
                checked={field.required}
                onChange={(e) => handleFieldUpdate({ ...field, required: e.target.checked })}
                disabled={field.locked}
                className="text-muted-foreground disabled:opacity-50"
              />
              <Label htmlFor="required" className="text-xs text-foreground">
                Required Field
              </Label>
            </div>
          </>
        )}
        {field.type === 'captcha' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Captcha type</Label>
              <Select
                value={field.captchaType || 'robot'}
                onChange={(e) => {
                  const captchaType = e.target.value
                  const meta =
                    [
                      { id: 'images', name: 'Images', label: 'Select the matching images' },
                      { id: 'robot', name: "I'm not a robot", label: "I'm not a robot" },
                      { id: 'audio', name: 'Audio', label: 'Listen and type the code' },
                      { id: 'math', name: 'Math-based', label: 'Solve the math problem' },
                      { id: 'invisible', name: 'Invisible / Score-based', label: 'Protected by invisible captcha' },
                      { id: 'text', name: 'Text-based', label: 'Enter the characters you see' },
                    ].find((t) => t.id === captchaType) || { id: 'robot', label: "I'm not a robot" }
                  handleFieldUpdate({
                    ...field,
                    captchaType: meta.id,
                    label: meta.label,
                    required: true,
                  })
                }}
                className="border-border bg-background text-sm h-9"
              >
                <option value="images">Images</option>
                <option value="robot">I&apos;m not a robot</option>
                <option value="audio">Audio</option>
                <option value="math">Math-based</option>
                <option value="invisible">Invisible / Score-based</option>
                <option value="text">Text-based</option>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
              Captcha is always required. Visitors must complete it before the form can be submitted.
            </p>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="style" className="space-y-3 mt-0">
        {/* Typography */}
        <div className="border-b border-border pb-2">
          <SectionHeader title="Typography" section="typography" />
          {expandedSections.typography && (
            <div className="space-y-2.5 mt-2.5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Font Family</Label>
                <Select
                  value={styles.fontFamily || 'Arial'}
                  onChange={(e) => updateStyle('fontFamily', e.target.value)}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  {fontFamilies.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                  <Input
                    type="number"
                    value={styles.fontSize ? parseFloat(styles.fontSize.replace('px', '')) : ''}
                    onChange={(e) => updateStyle('fontSize', e.target.value ? `${e.target.value}px` : '')}
                    placeholder="16"
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Font Weight</Label>
                  <Select
                    value={styles.fontWeight || '400'}
                    onChange={(e) => updateStyle('fontWeight', e.target.value)}
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  >
                    {fontWeights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Letter Spacing (px)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={styles.letterSpacing ? parseFloat(styles.letterSpacing.replace('px', '')) : ''}
                  onChange={(e) => updateStyle('letterSpacing', e.target.value ? `${e.target.value}px` : '')}
                  placeholder="0"
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                />
              </div>
              {field.type === 'heading' ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Line Height</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={styles.lineHeight ? parseFloat(String(styles.lineHeight).replace(/px$/, '')) : ''}
                    onChange={(e) => updateStyle('lineHeight', e.target.value || '')}
                    placeholder="1.3"
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Text Align</Label>
                <Select
                  value={styles.textAlign || 'left'}
                  onChange={(e) => {
                    const value = e.target.value
                    if (field.type === 'heading') {
                      onStyleChange({
                        ...field,
                        styles: { ...styles, textAlign: value, blockAlign: value },
                      })
                    } else {
                      updateStyle('textAlign', value)
                    }
                  }}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Text Transform</Label>
                <Select
                  value={styles.textTransform || 'none'}
                  onChange={(e) => updateStyle('textTransform', e.target.value)}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  <option value="none">None</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="lowercase">Lowercase</option>
                  <option value="capitalize">Capitalize</option>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Colors */}
        <div className="border-b border-border pb-2">
          <SectionHeader title="Colors" section="colors" />
          {expandedSections.colors && (
            <div className="space-y-2.5 mt-2.5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.color || '#000000'}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    className="h-10 w-16 border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.color || '#000000'}
                    onChange={(e) => updateStyle('color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={
                      styles.backgroundColor &&
                      styles.backgroundColor !== 'transparent' &&
                      /^#([0-9A-Fa-f]{6})$/.test(styles.backgroundColor)
                        ? styles.backgroundColor
                        : field.type === 'heading'
                          ? '#fef08a'
                          : '#ffffff'
                    }
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="h-10 w-16 border-border cursor-pointer"
                    title="Pick background color"
                  />
                  <Input
                    type="text"
                    value={styles.backgroundColor || (field.type === 'heading' ? '' : '#ffffff')}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    placeholder={field.type === 'heading' ? '#fef08a' : '#ffffff'}
                    className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
                {field.type === 'heading' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] text-sky-700 hover:underline"
                      onClick={() => updateStyle('backgroundColor', '')}
                    >
                      Clear background
                    </button>
                    {!styles.backgroundColor || styles.backgroundColor === 'transparent' ? (
                      <span className="text-[11px] text-muted-foreground">No background set</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Spacing */}
        <div className="border-b border-border pb-2">
          <SectionHeader title="Spacing" section="spacing" />
          {expandedSections.spacing && (
            <div className="space-y-2.5 mt-2.5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Padding</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Top</Label>
                    <Input
                      type="number"
                      value={styles.paddingTop ? parseFloat(styles.paddingTop.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('paddingTop', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Right</Label>
                    <Input
                      type="number"
                      value={styles.paddingRight ? parseFloat(styles.paddingRight.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('paddingRight', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Bottom</Label>
                    <Input
                      type="number"
                      value={styles.paddingBottom ? parseFloat(styles.paddingBottom.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('paddingBottom', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Left</Label>
                    <Input
                      type="number"
                      value={styles.paddingLeft ? parseFloat(styles.paddingLeft.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('paddingLeft', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Margin</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Top</Label>
                    <Input
                      type="number"
                      value={styles.marginTop ? parseFloat(styles.marginTop.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('marginTop', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Right</Label>
                    <Input
                      type="number"
                      value={styles.marginRight ? parseFloat(styles.marginRight.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('marginRight', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Bottom</Label>
                    <Input
                      type="number"
                      value={styles.marginBottom ? parseFloat(styles.marginBottom.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('marginBottom', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground/70">Left</Label>
                    <Input
                      type="number"
                      value={styles.marginLeft ? parseFloat(styles.marginLeft.replace('px', '')) : ''}
                      onChange={(e) => updateStyle('marginLeft', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="0"
                      className="border-border bg-muted/50 focus:bg-background text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Border */}
        <div className="border-b border-border pb-2">
          <SectionHeader title="Border" section="border" />
          {expandedSections.border && (
            <div className="space-y-2.5 mt-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Border Width (px)</Label>
                  <Input
                    type="number"
                    value={styles.borderWidth ? parseFloat(styles.borderWidth.replace('px', '')) : ''}
                    onChange={(e) => updateStyle('borderWidth', e.target.value ? `${e.target.value}px` : '')}
                    placeholder="1"
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Border Radius (px)</Label>
                  <Input
                    type="number"
                    value={
                      styles.borderRadius && styles.borderRadius !== '9999px'
                        ? parseFloat(String(styles.borderRadius).replace('px', '')) || ''
                        : ''
                    }
                    onChange={(e) => updateStyle('borderRadius', e.target.value ? `${e.target.value}px` : '')}
                    placeholder={styles.borderRadius === '9999px' ? 'Full' : '4'}
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Corner round</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: 'None', value: '' },
                    { label: 'Soft', value: '4px' },
                    { label: 'Med', value: '8px' },
                    { label: 'Large', value: '16px' },
                    { label: 'Round', value: '9999px' },
                  ].map(({ label, value }) => {
                    const active = (styles.borderRadius || '') === value
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => updateStyle('borderRadius', value)}
                        className={cn(
                          'rounded-md border px-1 py-1.5 text-[11px] font-medium transition-colors',
                          active
                            ? 'border-sky-500 bg-sky-50 text-sky-800'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Border Style</Label>
                <Select
                  value={styles.borderStyle || 'solid'}
                  onChange={(e) => updateStyle('borderStyle', e.target.value)}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  <option value="none">None</option>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                  <option value="double">Double</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Border Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styles.borderColor || '#e2e8f0'}
                    onChange={(e) => updateStyle('borderColor', e.target.value)}
                    className="h-10 w-16 border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.borderColor || '#e2e8f0'}
                    onChange={(e) => updateStyle('borderColor', e.target.value)}
                    placeholder="#e2e8f0"
                    className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="layout" className="space-y-3 mt-0">
        <div className="border-b border-border pb-2">
          <SectionHeader title="Layout" section="layout" />
          {expandedSections.layout && (
            <div className="space-y-2.5 mt-2.5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Select
                  value={
                    ['auto', '100%', '75%', '50%', '25%'].includes(styles.width)
                      ? styles.width
                      : styles.width
                        ? 'custom'
                        : '100%'
                  }
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      updateStyle('width', styles.width && !['auto', '100%', '75%', '50%', '25%'].includes(styles.width) ? styles.width : '300px')
                    } else {
                      updateStyle('width', e.target.value)
                    }
                  }}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="100%">100%</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                  <option value="25%">25%</option>
                  <option value="custom">Custom</option>
                </Select>
                {styles.width && !['auto', '100%', '75%', '50%', '25%'].includes(styles.width) ? (
                  <Input
                    type="text"
                    value={styles.width}
                    onChange={(e) => updateStyle('width', e.target.value)}
                    placeholder="300px or 40%"
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  />
                ) : null}
              </div>
              {field.type === 'heading' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Height (px)</Label>
                      <Input
                        type="number"
                        value={styles.height ? parseFloat(String(styles.height).replace('px', '')) : ''}
                        onChange={(e) => updateStyle('height', e.target.value ? `${e.target.value}px` : '')}
                        placeholder="Auto"
                        className="border-border bg-muted/50 focus:bg-background text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Min height (px)</Label>
                      <Input
                        type="number"
                        value={styles.minHeight ? parseFloat(String(styles.minHeight).replace('px', '')) : ''}
                        onChange={(e) => updateStyle('minHeight', e.target.value ? `${e.target.value}px` : '')}
                        placeholder="0"
                        className="border-border bg-muted/50 focus:bg-background text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Block position</Label>
                    <Select
                      value={styles.blockAlign || styles.textAlign || 'left'}
                      onChange={(e) => {
                        const value = e.target.value
                        onStyleChange({
                          ...field,
                          styles: { ...styles, blockAlign: value, textAlign: value },
                        })
                      }}
                      className="border-border bg-muted/50 focus:bg-background text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Middle</option>
                      <option value="right">Right</option>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Positions the heading block when width is less than 100%.
                    </p>
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Display</Label>
                <Select
                  value={styles.display || 'block'}
                  onChange={(e) => updateStyle('display', e.target.value)}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  <option value="block">Block</option>
                  <option value="inline-block">Inline Block</option>
                  <option value="inline">Inline</option>
                  <option value="flex">Flex</option>
                </Select>
              </div>
              {field.type !== 'heading' ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <Select
                    value={styles.position || 'static'}
                    onChange={(e) => updateStyle('position', e.target.value)}
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  >
                    <option value="static">Static</option>
                    <option value="relative">Relative</option>
                    <option value="absolute">Absolute</option>
                    <option value="fixed">Fixed</option>
                  </Select>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}

