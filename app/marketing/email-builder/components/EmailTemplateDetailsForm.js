'use client'

import { useMemo } from 'react'
import { ArrowRight, Check, FileText, FolderOpen, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import { cn } from '@/lib/utils'

/**
 * Template details form — compact wide layout (no scroll).
 * Required: location, category, name. Optional: description.
 */
export default function EmailTemplateDetailsForm({
  locationID,
  setLocationID,
  categoryId,
  setCategoryId,
  categories,
  templateName,
  setTemplateName,
  templateDescription,
  setTemplateDescription,
  showContinue = false,
  onContinue,
  continueLabel = 'Continue to design',
  className,
}) {
  const checks = useMemo(() => {
    const hasLocation =
      locationID === ALL_BRANCHES_VALUE ||
      (Array.isArray(locationID) && locationID.length > 0)
    return {
      location: hasLocation,
      category: !!categoryId,
      name: !!String(templateName || '').trim(),
    }
  }, [locationID, categoryId, templateName])

  const doneCount = Object.values(checks).filter(Boolean).length
  const canContinue = doneCount === 3

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
              canContinue
                ? 'bg-success/10 text-success'
                : 'bg-card text-muted-foreground border border-border',
            )}
          >
            {doneCount}/3
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {canContinue
              ? 'Ready — continue to design your email'
              : 'Studio, category, and name are required'}
          </p>
        </div>
        {showContinue ? (
          <Button
            type="button"
            variant="gradient"
            disabled={!canContinue}
            onClick={() => onContinue?.()}
            className="h-9 rounded-lg shrink-0"
          >
            {continueLabel}
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="space-y-1.5 lg:col-span-1">
          <Label className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
            <span
              className={cn(
                'h-5 w-5 rounded flex items-center justify-center',
                checks.location ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {checks.location ? <Check className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            </span>
            Studio location <span className="text-destructive">*</span>
          </Label>
          <LocationSelector
            value={locationID}
            onChange={setLocationID}
            multiple
            allowAllBranches
            showAllOption={false}
            placeholder="Select studio(s)…"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
            <span
              className={cn(
                'h-5 w-5 rounded flex items-center justify-center',
                checks.category ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {checks.category ? <Check className="h-3 w-3" /> : <FolderOpen className="h-3 w-3" />}
            </span>
            Category <span className="text-destructive">*</span>
          </Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30 h-10"
          >
            <option value="">Select a category…</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          {categories.length === 0 ? (
            <p className="text-[10px] text-warning">Create a category under Templates first.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground inline-flex items-center gap-1.5">
            <span
              className={cn(
                'h-5 w-5 rounded flex items-center justify-center',
                checks.name ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {checks.name ? <Check className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            </span>
            Template name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Welcome series — week 1"
            className="rounded-lg h-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          value={templateDescription}
          onChange={(e) => setTemplateDescription(e.target.value)}
          placeholder="Short note for your team — not shown in the email"
          className="rounded-lg h-10"
        />
      </div>
    </div>
  )
}

export function isTemplateDetailsComplete({ locationID, categoryId, templateName }) {
  const hasLocation =
    locationID === ALL_BRANCHES_VALUE ||
    (Array.isArray(locationID) && locationID.length > 0)
  return hasLocation && !!categoryId && !!String(templateName || '').trim()
}
