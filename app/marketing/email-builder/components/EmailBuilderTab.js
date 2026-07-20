'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Columns,
  ChevronDown,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Mail,
  Minus,
  Send,
  Square,
  Copy,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import LocationSelector, { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import { useToast } from '@/components/ui/toast'
import StylePanel from '@/components/forms/StylePanel'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { LEAD_STAGE_VALUES, formatLeadStageLabel } from '@/lib/lead-stages'
import EmailHtmlPanel from './EmailHtmlPanel'
import EmailCanvasModeTabs from './EmailCanvasModeTabs'
import EmailPreviewFrame from './EmailPreviewFrame'
import { extractCategoriesList, extractLeadReasonsList } from '../emailBuilderApi'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const contentBlocks = [
  { id: 'heading', name: 'Heading', icon: FileText },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'image', name: 'Image', icon: ImageIcon },
  { id: 'button', name: 'Button', icon: Square },
  { id: 'link', name: 'Link', icon: Link2 },
  { id: 'columns', name: 'Columns', icon: Columns },
  { id: 'divider', name: 'Divider', icon: Minus },
]

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function stylesToString(styles = {}) {
  const entries = Object.entries(styles || {}).filter(([, v]) => v != null && String(v).trim() !== '')
  if (entries.length === 0) return ''
  return entries
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${String(v)}`)
    .join(';')
}

function blockToHtml(block) {
  const style = stylesToString(block.styles || {})
  const content = escapeHtml(block.content || '')
  const contentWithBreaks = content.replaceAll('\n', '<br/>')

  switch (block.type) {
    case 'heading':
      return `<h2 style="${style}">${contentWithBreaks || 'Heading'}</h2>`
    case 'text':
      return `<p style="${style}">${contentWithBreaks || 'Text'}</p>`
    case 'divider':
      return `<hr style="${style}"/>`
    case 'link':
      return `<a href="#" style="${style}">${contentWithBreaks || 'Link'}</a>`
    case 'button': {
      const btnStyle = style || 'display:inline-block;padding:10px 14px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none'
      return `<a href="#" style="${btnStyle}">${contentWithBreaks || 'Button'}</a>`
    }
    case 'image': {
      const src = String(block.content || '').trim()
      const safeSrc = src ? escapeHtml(src) : ''
      return safeSrc
        ? `<img alt="Image" src="${safeSrc}" style="${style}"/>`
        : `<div style="${style}">[Image]</div>`
    }
    case 'columns':
      return `<table role="presentation" style="width:100%;${style}" cellspacing="0" cellpadding="0"><tr><td style="width:50%;padding:8px;background:#f1f5f9;border-radius:8px;">Column 1</td><td style="width:50%;padding:8px;background:#f1f5f9;border-radius:8px;">Column 2</td></tr></table>`
    default:
      return `<div style="${style}">${contentWithBreaks}</div>`
  }
}

function blocksToHtml(blocks = []) {
  if (!blocks.length) return ''
  const body = blocks.map(blockToHtml).join('\n')
  return `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">${body}</div>`
}

function SortableEmailBlock({ block, isSelected, onSelect, onRemove, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const render = () => {
    const s = block.styles || {}
    const baseStyle = {
      fontWeight: s.fontWeight,
      color: s.color,
      backgroundColor: s.backgroundColor,
      padding: `${s.paddingTop || '12px'} ${s.paddingRight || '12px'} ${s.paddingBottom || '12px'} ${s.paddingLeft || '12px'}`,
      textAlign: s.textAlign,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      letterSpacing: s.letterSpacing,
      textTransform: s.textTransform,
      borderRadius: s.borderRadius,
      borderWidth: s.borderWidth,
      borderStyle: s.borderStyle,
      borderColor: s.borderColor,
    }

    switch (block.type) {
      case 'heading':
        return <h2 style={baseStyle} className="text-2xl font-bold">{block.content || 'Heading'}</h2>
      case 'text':
        return <p style={baseStyle} className="text-base whitespace-pre-wrap">{block.content || 'Text'}</p>
      case 'divider':
        return <div style={baseStyle}><hr className="border-slate-300" /></div>
      case 'image': {
        const src = String(block.content || '').trim()
        const showImg = src && (/^https?:\/\//i.test(src) || src.startsWith('/'))
        return (
          <div style={baseStyle} className="text-center">
            {showImg ? (
              <img
                src={src}
                alt=""
                className="max-w-full h-auto max-h-48 mx-auto rounded-lg border border-slate-200 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-full h-40 bg-slate-100 rounded-lg flex flex-col items-center justify-center border border-slate-200 gap-2">
                <ImageIcon className="h-10 w-10 text-slate-400" />
                <span className="text-slate-500 text-xs">Image</span>
              </div>
            )}
            {src && !showImg ? <p className="text-xs text-amber-600 mt-2 truncate">{src}</p> : null}
          </div>
        )
      }
      case 'button':
        return (
          <div style={baseStyle} className="text-center">
            <Button variant="gradient">{block.content || 'Button'}</Button>
          </div>
        )
      case 'link':
        return (
          <div style={baseStyle}>
            <a href="#" className="text-brand underline">{block.content || 'Link'}</a>
          </div>
        )
      case 'columns':
        return (
          <div style={baseStyle} className="grid grid-cols-2 gap-3">
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">Column 1</div>
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">Column 2</div>
          </div>
        )
      default:
        return <div style={baseStyle}>{block.content || 'Block'}</div>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? 'ring-2 ring-brand ring-offset-2' : 'hover:bg-slate-50'} rounded-lg transition-all`}
    >
      <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 hover:bg-slate-200 rounded cursor-grab active:cursor-grabbing bg-white border border-slate-200 shadow-sm"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-slate-500" />
        </button>
        <button
          className="p-1.5 hover:bg-slate-100 rounded bg-white border border-slate-200 shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate?.(block.id)
          }}
          title="Duplicate block"
        >
          <Copy className="h-4 w-4 text-slate-500" />
        </button>
        <button
          className="p-1.5 hover:bg-red-50 rounded bg-white border border-slate-200 shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(block.id)
          }}
          title="Remove block"
        >
          <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
        </button>
      </div>

      <div onClick={() => onSelect(block.id)} className="p-4 cursor-pointer">
        {render()}
      </div>
    </div>
  )
}

function DraggableContentBlock({ block, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-type-${block.id}`,
    data: { type: 'blockType', block },
  })

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  const Icon = block.icon

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(block)}
      type="button"
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors text-xs font-medium text-slate-700 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200 min-h-[72px]',
        isDragging && 'opacity-50'
      )}
    >
      <Icon className="h-5 w-5 text-slate-600" />
      <span className="text-center leading-tight">{block.name}</span>
    </button>
  )
}

function DroppableEmailCanvas({ children, isEmpty, onCanvasClick, className }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'email-canvas', data: { type: 'canvas' } })
  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCanvasClick?.()
      }}
      className={cn(
        'w-full transition-colors',
        isOver && 'bg-brand/10 border-2 border-brand-light border-dashed',
        isEmpty && 'border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center',
        className
      )}
    >
      {children}
    </div>
  )
}

export default function EmailBuilderTab({ onCreated }) {
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')
  const [locationID, setLocationID] = useState([]) // 'all' | string[]
  // Per backend contract:
  // - `subject` is used as the template "name"
  // - `body` is used as the template "description"
  // - `htmlBody` is the actual email content
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [leadStage, setLeadStage] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [reasons, setReasons] = useState([])
  const [emailBlocks, setEmailBlocks] = useState([])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [canvasView, setCanvasView] = useState('visual')
  const [htmlBody, setHtmlBody] = useState('')
  const [htmlCustomized, setHtmlCustomized] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchCategories = useCallback(async () => {
    const result = await api.get('/api/email/builder/category')
    if (result.success) {
      const list = extractCategoriesList(result)
      setCategories(list)
    }
  }, [])

  const locationScopedCategories = useMemo(() => {
    if (!locationID || (locationID !== ALL_BRANCHES_VALUE && (!Array.isArray(locationID) || locationID.length === 0))) {
      return categories
    }
    // "All branches" is resolved on the server (org-wide for superadmin, assigned
    // locations for staff). Keep the header-scoped category list and let the API
    // enforce coverage — filtering to allLocations-only wrongly hides staff categories.
    if (locationID === ALL_BRANCHES_VALUE) {
      return categories
    }
    return categories.filter((cat) => {
      if (cat.allLocations) return true
      const catLocs = (Array.isArray(cat.locationID) ? cat.locationID : cat.locationID ? [cat.locationID] : [])
        .map((l) => String(l?._id || l))
      return locationID.every((id) => catLocs.includes(String(id)))
    })
  }, [categories, locationID])

  useEffect(() => {
    if (!locationScopedCategories.length) {
      setCategoryId('')
      return
    }
    setCategoryId((prev) =>
      locationScopedCategories.some((c) => c._id === prev)
        ? prev
        : locationScopedCategories[0]._id
    )
  }, [locationScopedCategories])

  const fetchReasons = useCallback(async () => {
    const result = await api.get('/api/lead-reasons')
    if (result.success) {
      setReasons(extractLeadReasonsList(result))
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchReasons()
  }, [fetchCategories, fetchReasons])

  const generatedHtml = useMemo(() => blocksToHtml(emailBlocks), [emailBlocks])

  useEffect(() => {
    if (!htmlCustomized) {
      setHtmlBody(generatedHtml)
    }
  }, [generatedHtml, htmlCustomized])

  const effectiveHtmlBody = useMemo(() => {
    const custom = String(htmlBody || '').trim()
    if (htmlCustomized && custom) return custom
    return generatedHtml
  }, [htmlBody, htmlCustomized, generatedHtml])

  const syncHtmlFromVisual = () => {
    setHtmlCustomized(false)
    setHtmlBody(generatedHtml)
  }

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      styles: {},
    }
    setEmailBlocks((prev) => [...prev, newBlock])
    setSelectedBlock(newBlock.id)
  }

  const removeBlock = (id) => {
    setEmailBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedBlock === id) setSelectedBlock(null)
  }

  const duplicateBlock = (id) => {
    const block = emailBlocks.find((b) => b.id === id)
    if (!block) return
    const copy = {
      ...block,
      id: `${Date.now()}`,
      styles: { ...(block.styles || {}) },
    }
    setEmailBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id)
      if (idx === -1) return [...prev, copy]
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setSelectedBlock(copy.id)
  }

  const resetBuilder = () => {
    setTemplateName('')
    setTemplateDescription('')
    setLeadStage('')
    setReasonCode('')
    setEmailBlocks([])
    setSelectedBlock(null)
    setCanvasView('visual')
    setHtmlCustomized(false)
    setHtmlBody('')
  }

  const handleDragStart = (event) => setActiveId(event.active.id)

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) {
      setActiveId(null)
      return
    }

    if (String(active.id).startsWith('block-type-')) {
      const blockTypeId = String(active.id).replace('block-type-', '')
      const blockType = contentBlocks.find((b) => b.id === blockTypeId)
      if (blockType) addBlock(blockType.id)
      setActiveId(null)
      return
    }

    if (active.id !== over.id) {
      const activeIndex = emailBlocks.findIndex((item) => item.id === active.id)
      const overIndex = emailBlocks.findIndex((item) => item.id === over.id)
      if (activeIndex !== -1 && overIndex !== -1) {
        setEmailBlocks((items) => arrayMove(items, activeIndex, overIndex))
      }
    }

    setActiveId(null)
  }

  const selectedBlockData = useMemo(
    () => emailBlocks.find((b) => b.id === selectedBlock) || null,
    [emailBlocks, selectedBlock]
  )

  const showBlockSettings = canvasView === 'visual' && !!selectedBlockData
  const showComponentsSidebar = canvasView === 'visual'
  const mainColSpan = showComponentsSidebar ? (showBlockSettings ? 6 : 9) : 12

  useEffect(() => {
    if (canvasView !== 'visual') setSelectedBlock(null)
  }, [canvasView])

  const clearBlockSelection = () => setSelectedBlock(null)

  useEffect(() => {
    if (!showBlockSettings) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') clearBlockSelection()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showBlockSettings])

  const updateBlock = (updatedBlock) => {
    setEmailBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)))
  }

  const stylePanelField = useMemo(() => {
    if (!selectedBlockData) return null
    return {
      ...selectedBlockData,
      // StylePanel expects these:
      label: selectedBlockData.content || '',
      placeholder: '',
      required: false,
      options: [],
    }
  }, [selectedBlockData])

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error({ title: 'Missing template name', message: 'Please enter a name.' })
      return
    }
    if (!templateDescription.trim()) {
      toast.error({ title: 'Missing description', message: 'Please enter a description.' })
      return
    }
    if (!String(leadStage || '').trim()) {
      toast.error({ title: 'Missing lead stage', message: 'Please enter a lead stage.' })
      return
    }
    if (!String(reasonCode || '').trim()) {
      toast.error({ title: 'Missing reason', message: 'Please enter a reason.' })
      return
    }
    if (!categoryId) {
      toast.error({
        title: 'Missing category',
        message: locationScopedCategories.length === 0
          ? 'Create a category for this studio under Templates → Categories first.'
          : 'Please select a category.',
      })
      return
    }
    if (!locationID || (locationID !== ALL_BRANCHES_VALUE && (!Array.isArray(locationID) || locationID.length === 0))) {
      toast.error({ title: 'Missing location', message: 'Select one or more studios, or All branches.' })
      return
    }
    const htmlToSave = String(effectiveHtmlBody || '').trim()
    if (!htmlToSave) {
      toast.error({ title: 'Empty email', message: 'Add blocks or paste HTML content.' })
      return
    }
    setSaving(true)
    try {
      const allLocations = locationID === ALL_BRANCHES_VALUE
      const payload = {
        categoryID: categoryId,
        subject: templateName.trim(),
        body: templateDescription.trim(),
        leadStage: String(leadStage || '').trim(),
        reason: String(reasonCode || '').trim(),
        htmlBody: htmlToSave,
        allLocations,
        locationID: allLocations ? [] : locationID,
      }
      const result = await api.post('/api/email/builder/', payload)
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create email template.' })
        return
      }
      toast.success({ title: 'Created', message: 'Email template created successfully.' })
      resetBuilder()
      onCreated?.(result.data)
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Error', message: 'Could not create email template.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabsContent value="builder" className="mt-6">
      <div className="h-[calc(100vh-200px)] flex flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            {/* Components — visual mode only */}
            {showComponentsSidebar && (
            <div className="col-span-3 flex flex-col min-h-0 self-stretch">
              <Card className="flex flex-col flex-1 min-h-0 h-full">
                <CardHeader className="flex-shrink-0 border-b">
                  <CardTitle className="text-base">Components</CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto flex-1 pb-2 min-h-0 p-3" style={{ overscrollBehavior: 'contain' }}>
                  <div className="grid grid-cols-2 gap-2">
                  {contentBlocks.map((block) => (
                    <DraggableContentBlock
                      key={block.id}
                      block={block}
                      onClick={(b) => addBlock(b.id)}
                    />
                  ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

            {/* Main workspace — full width on HTML & Preview */}
            <div
              className={cn(
                'flex flex-col min-h-0 transition-all duration-200',
                mainColSpan === 12 ? 'col-span-12' : mainColSpan === 6 ? 'col-span-6' : 'col-span-9'
              )}
            >
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="flex-shrink-0 border-b space-y-3 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Email content</CardTitle>
                    <Button variant="gradient" size="sm" onClick={saveTemplate} disabled={saving} className="shrink-0">
                      <Send className="h-4 w-4 mr-2" />
                      {saving ? 'Saving…' : 'Save template'}
                    </Button>
                  </div>

                  <EmailCanvasModeTabs value={canvasView} onChange={setCanvasView} className="w-full" />
                </CardHeader>

                <CardContent
                  className="flex-1 min-h-0 flex flex-col gap-3 px-4 pt-3 pb-4 overflow-hidden"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <details
                    className="group rounded-xl border border-slate-200/80 bg-slate-50/40 open:bg-white transition-colors shrink-0"
                    open={canvasView === 'visual'}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
                      <span>Template details</span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4 border-t border-slate-100 pt-3">
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-slate-600">Studio location *</Label>
                        <div className="mt-1.5">
                          <LocationSelector
                            value={locationID}
                            onChange={setLocationID}
                            multiple
                            allowAllBranches
                            showAllOption={false}
                            placeholder="Select studio(s)…"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-slate-600">Category</Label>
                        <select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        >
                          <option value="">Select a category…</option>
                          {locationScopedCategories.map((cat) => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Template name</Label>
                        <Input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Template name"
                          className="mt-1.5 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Lead stage</Label>
                        <select
                          value={leadStage}
                          onChange={(e) => setLeadStage(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        >
                          <option value="">Select lead stage…</option>
                          {LEAD_STAGE_VALUES.map((s) => (
                            <option key={s} value={s}>
                              {formatLeadStageLabel(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-slate-600">Template description</Label>
                        <Textarea
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          rows={2}
                          placeholder="Short description"
                          className="mt-1.5 rounded-lg resize-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-xs text-slate-600">Reason</Label>
                        <select
                          value={reasonCode}
                          onChange={(e) => setReasonCode(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                        >
                          <option value="">Select reason…</option>
                          {reasons.map((r) => (
                            <option key={r._id || r.reasonCode || r.name} value={r.reasonCode}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </details>

                  <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
                  {canvasView === 'visual' && (
                    <DroppableEmailCanvas
                      isEmpty={emailBlocks.length === 0}
                      onCanvasClick={clearBlockSelection}
                      className="min-h-[420px] w-full"
                    >
                      {emailBlocks.length === 0 ? (
                        <div className="text-center py-16 px-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                          <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                            <Mail className="h-7 w-7 text-slate-300" />
                          </div>
                          <p className="text-slate-600 text-sm font-medium">Add components to get started</p>
                        </div>
                      ) : (
                        <div
                          className="space-y-3 pl-10 pr-2 py-2 relative min-h-[200px]"
                          onClick={(e) => {
                            if (e.target === e.currentTarget) clearBlockSelection()
                          }}
                        >
                          <SortableContext items={emailBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                            {emailBlocks.map((block) => (
                              <SortableEmailBlock
                                key={block.id}
                                block={block}
                                isSelected={selectedBlock === block.id}
                                onSelect={setSelectedBlock}
                                onRemove={removeBlock}
                                onDuplicate={duplicateBlock}
                              />
                            ))}
                          </SortableContext>
                        </div>
                      )}
                    </DroppableEmailCanvas>
                  )}

                  {canvasView === 'html' && (
                    <EmailHtmlPanel
                      htmlBody={htmlBody}
                      onHtmlBodyChange={(value) => {
                        setHtmlBody(value)
                        setHtmlCustomized(true)
                      }}
                      onSyncFromVisual={syncHtmlFromVisual}
                      showSyncFromVisual
                      layout="editor-only"
                      className="h-full min-h-[calc(100vh-340px)]"
                    />
                  )}

                  {canvasView === 'preview' && (
                    <EmailPreviewFrame
                      html={effectiveHtmlBody}
                      emptyMessage="Nothing to preview yet."
                      fullWidth
                      className="h-full min-h-[calc(100vh-340px)]"
                    />
                  )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {showBlockSettings && selectedBlockData && (
              <div className="col-span-3 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 min-h-0 border-brand/20 shadow-md">
                  <CardHeader className="flex-shrink-0 border-b pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base capitalize">{selectedBlockData.type}</CardTitle>
                      </div>
                      <button
                        type="button"
                        onClick={clearBlockSelection}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Close settings"
                        aria-label="Close block settings"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-y-auto flex-1 pb-2 min-h-0" style={{ overscrollBehavior: 'contain' }}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">
                          {selectedBlockData.type === 'image' ? 'Image URL' : 'Content'}
                        </Label>
                        <Textarea
                          value={selectedBlockData.content}
                          onChange={(e) => updateBlock({ ...selectedBlockData, content: e.target.value })}
                          rows={selectedBlockData.type === 'image' ? 2 : 4}
                          placeholder={
                            selectedBlockData.type === 'image'
                              ? 'https://example.com/image.jpg'
                              : undefined
                          }
                          className="text-sm"
                        />
                      </div>
                      <StylePanel
                        field={stylePanelField}
                        onStyleChange={(updated) => updateBlock({ ...selectedBlockData, styles: updated.styles || {} })}
                        onFieldUpdate={(updated) => {
                          updateBlock({
                            ...selectedBlockData,
                            content: updated.label ?? selectedBlockData.content,
                            styles: updated.styles || {},
                          })
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="p-4 rounded-lg border-2 border-brand bg-white shadow-xl">
                {String(activeId).startsWith('block-type-') ? (
                  (() => {
                    const block = contentBlocks.find((bt) => `block-type-${bt.id}` === String(activeId))
                    const Icon = block?.icon
                    return (
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                        {Icon && <Icon className="h-5 w-5 text-slate-600" />}
                        <span>{block?.name}</span>
                      </div>
                    )
                  })()
                ) : (
                  <div className="text-sm font-medium text-slate-700">
                    {emailBlocks.find((b) => b.id === activeId)?.content || 'Moving block…'}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </TabsContent>
  )
}

