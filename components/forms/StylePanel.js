'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChevronDown, ChevronUp } from 'lucide-react'

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

export default function StylePanel({ field, onStyleChange, onFieldUpdate }) {
  const [expandedSections, setExpandedSections] = useState({
    typography: true,
    spacing: true,
    colors: true,
    border: true,
    layout: true,
  })

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

  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
        <TabsTrigger value="content" className="text-xs">Content</TabsTrigger>
        <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
        <TabsTrigger value="layout" className="text-xs">Layout</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-3 mt-0">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Label</Label>
          <Input
            value={field.label}
            onChange={(e) => handleFieldUpdate({ ...field, label: e.target.value })}
            className="border-border bg-background text-sm h-9"
          />
        </div>
        {field.type !== 'submit' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Placeholder</Label>
              <Input
                value={field.placeholder}
                onChange={(e) => handleFieldUpdate({ ...field, placeholder: e.target.value })}
                className="border-border bg-background text-sm h-9"
              />
            </div>
            {(field.type === 'select' || field.type === 'checkbox') && (
              <div className="space-y-2.5">
                <Label className="text-xs text-muted-foreground font-medium">Options</Label>
                {field.locked ? (
                  <div className="space-y-1.5">
                    {field.name === 'reason' && (
                      <p className="text-xs text-muted-foreground">
                        Options are loaded from your existing lead reasons.
                      </p>
                    )}
                    <ul className="text-xs text-muted-foreground space-y-1 rounded-md border border-border p-2 max-h-36 overflow-y-auto">
                      {(field.options || []).length > 0 ? (
                        field.options.map((opt, idx) => (
                          <li key={opt.value || opt.label || idx}>{opt.label || opt.value}</li>
                        ))
                      ) : (
                        <li>No options available</li>
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
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="checkbox"
                id="required"
                checked={field.required}
                onChange={(e) => handleFieldUpdate({ ...field, required: e.target.checked })}
                className="text-muted-foreground"
              />
              <Label htmlFor="required" className="text-xs text-foreground">
                Required Field
              </Label>
            </div>
          </>
        )}
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
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Text Align</Label>
                <Select
                  value={styles.textAlign || 'left'}
                  onChange={(e) => updateStyle('textAlign', e.target.value)}
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
                    value={styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="h-10 w-16 border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 border-border bg-muted/50 focus:bg-background text-sm"
                  />
                </div>
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
                    value={styles.borderRadius ? parseFloat(styles.borderRadius.replace('px', '')) : ''}
                    onChange={(e) => updateStyle('borderRadius', e.target.value ? `${e.target.value}px` : '')}
                    placeholder="4"
                    className="border-border bg-muted/50 focus:bg-background text-sm"
                  />
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
                  value={styles.width || '100%'}
                  onChange={(e) => updateStyle('width', e.target.value)}
                  className="border-border bg-muted/50 focus:bg-background text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="100%">100%</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                  <option value="25%">25%</option>
                </Select>
              </div>
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
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}

