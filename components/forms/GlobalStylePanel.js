'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getGlobalStyleExcludeKey } from '@/lib/form-global-styles'

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

/**
 * Form-wide CSS defaults. Excluded fields skip these styles.
 */
export default function GlobalStylePanel({
  styles = {},
  excludeKeys = [],
  fields = [],
  onStylesChange,
  onExcludeKeysChange,
}) {
  const [expandedSections, setExpandedSections] = useState({
    typography: true,
    colors: true,
    spacing: false,
    border: true,
    layout: false,
  })

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const updateStyle = (key, value) => {
    onStylesChange({ ...styles, [key]: value })
  }

  const clearStyles = () => onStylesChange({})

  const toggleExclude = (key) => {
    if (!key) return
    if (excludeKeys.includes(key)) {
      onExcludeKeysChange(excludeKeys.filter((k) => k !== key))
    } else {
      onExcludeKeysChange([...excludeKeys, key])
    }
  }

  const SectionHeader = ({ title, section }) => (
    <button
      type="button"
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

  const excludableFields = fields.filter(
    (f) => f && !f.hidden && f.type !== 'hidden' && f.name !== 'organisationID' && f.name !== 'formID'
  )

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        These styles apply to all fields by default. Field-level styles still override. Use Exclude to skip
        specific fields.
      </p>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
          <TabsTrigger value="style" className="text-xs">
            Style
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            Layout
          </TabsTrigger>
          <TabsTrigger value="exclude" className="text-xs">
            Exclude
          </TabsTrigger>
        </TabsList>

        <TabsContent value="style" className="space-y-3 mt-0">
          <div className="border-b border-border pb-2">
            <SectionHeader title="Typography" section="typography" />
            {expandedSections.typography && (
              <div className="space-y-2.5 mt-2.5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Font Family</Label>
                  <Select
                    value={styles.fontFamily || ''}
                    onChange={(e) => updateStyle('fontFamily', e.target.value)}
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  >
                    <option value="">Default</option>
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
                      value={styles.fontSize ? parseFloat(String(styles.fontSize).replace('px', '')) : ''}
                      onChange={(e) => updateStyle('fontSize', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="14"
                      className="border-border bg-muted/50 focus:bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Font Weight</Label>
                    <Select
                      value={styles.fontWeight || ''}
                      onChange={(e) => updateStyle('fontWeight', e.target.value)}
                      className="border-border bg-muted/50 focus:bg-background text-sm"
                    >
                      <option value="">Default</option>
                      {fontWeights.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Text Align</Label>
                  <Select
                    value={styles.textAlign || ''}
                    onChange={(e) => updateStyle('textAlign', e.target.value)}
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  >
                    <option value="">Default</option>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="border-b border-border pb-2">
            <SectionHeader title="Colors" section="colors" />
            {expandedSections.colors && (
              <div className="space-y-2.5 mt-2.5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Text / Label Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={styles.color && /^#([0-9A-Fa-f]{6})$/.test(styles.color) ? styles.color : '#334155'}
                      onChange={(e) => updateStyle('color', e.target.value)}
                      className="h-10 w-16 border-border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={styles.color || ''}
                      onChange={(e) => updateStyle('color', e.target.value)}
                      placeholder="#334155"
                      className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Input Background</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={
                        styles.backgroundColor && /^#([0-9A-Fa-f]{6})$/.test(styles.backgroundColor)
                          ? styles.backgroundColor
                          : '#ffffff'
                      }
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                      className="h-10 w-16 border-border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={styles.backgroundColor || ''}
                      onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                      placeholder="#ffffff"
                      className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-b border-border pb-2">
            <SectionHeader title="Spacing" section="spacing" />
            {expandedSections.spacing && (
              <div className="space-y-2.5 mt-2.5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Padding</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Top', 'Right', 'Bottom', 'Left'].map((side) => {
                      const key = `padding${side}`
                      return (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs text-muted-foreground/70">{side}</Label>
                          <Input
                            type="number"
                            value={styles[key] ? parseFloat(String(styles[key]).replace('px', '')) : ''}
                            onChange={(e) => updateStyle(key, e.target.value ? `${e.target.value}px` : '')}
                            placeholder="0"
                            className="border-border bg-muted/50 focus:bg-background text-xs"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-b border-border pb-2">
            <SectionHeader title="Border" section="border" />
            {expandedSections.border && (
              <div className="space-y-2.5 mt-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Width (px)</Label>
                    <Input
                      type="number"
                      value={styles.borderWidth ? parseFloat(String(styles.borderWidth).replace('px', '')) : ''}
                      onChange={(e) => updateStyle('borderWidth', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="1"
                      className="border-border bg-muted/50 focus:bg-background text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Radius (px)</Label>
                    <Input
                      type="number"
                      value={
                        styles.borderRadius && styles.borderRadius !== '9999px'
                          ? parseFloat(String(styles.borderRadius).replace('px', '')) || ''
                          : ''
                      }
                      onChange={(e) => updateStyle('borderRadius', e.target.value ? `${e.target.value}px` : '')}
                      placeholder="4"
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
                  <Label className="text-xs text-muted-foreground">Border Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={
                        styles.borderColor && /^#([0-9A-Fa-f]{6})$/.test(styles.borderColor)
                          ? styles.borderColor
                          : '#e2e8f0'
                      }
                      onChange={(e) => updateStyle('borderColor', e.target.value)}
                      className="h-10 w-16 border-border cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={styles.borderColor || ''}
                      onChange={(e) => updateStyle('borderColor', e.target.value)}
                      placeholder="#e2e8f0"
                      className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={clearStyles}
            className="text-[11px] text-sky-700 hover:underline"
          >
            Clear all global styles
          </button>
        </TabsContent>

        <TabsContent value="layout" className="space-y-3 mt-0">
          <div className="border-b border-border pb-2">
            <SectionHeader title="Layout" section="layout" />
            {expandedSections.layout && (
              <div className="space-y-2.5 mt-2.5">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Width</Label>
                  <Select
                    value={styles.width || ''}
                    onChange={(e) => updateStyle('width', e.target.value)}
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  >
                    <option value="">Default</option>
                    <option value="100%">100%</option>
                    <option value="75%">75%</option>
                    <option value="50%">50%</option>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="exclude" className="space-y-3 mt-0">
          <p className="text-[11px] text-muted-foreground">
            Checked fields will not receive global CSS. Their own field styles still apply.
          </p>
          {excludableFields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Add fields to the form first.</p>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {excludableFields.map((field) => {
                const key = getGlobalStyleExcludeKey(field)
                const checked = excludeKeys.includes(key) || Boolean(field.excludeFromGlobalStyles)
                return (
                  <label
                    key={field.id}
                    className={cn(
                      'flex items-start gap-2.5 rounded-md border px-2.5 py-2 cursor-pointer transition-colors',
                      checked ? 'border-amber-300 bg-amber-50/80' : 'border-border bg-background hover:bg-muted/40'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExclude(key)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">
                        {field.label || field.name || field.type}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {field.type}
                        {key ? ` · ${key}` : ''}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
          {excludeKeys.length > 0 ? (
            <button
              type="button"
              onClick={() => onExcludeKeysChange([])}
              className="text-[11px] text-sky-700 hover:underline"
            >
              Clear exclusions ({excludeKeys.length})
            </button>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
