'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Columns,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Mail,
  Minus,
  Code2,
  Pencil,
  Send,
  Square,
  Copy,
  Trash2,
  Type,
  Video,
  Play,
  X,
  ArrowLeft,
} from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ALL_BRANCHES_VALUE } from '@/components/shared/LocationSelector'
import { useToast } from '@/components/ui/toast'
import StylePanel from '@/components/forms/StylePanel'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import EmailHtmlPanel from './EmailHtmlPanel'
import EmailCanvasModeTabs from './EmailCanvasModeTabs'
import EmailPreviewFrame from './EmailPreviewFrame'
import EmailVisualHtmlEditor from './EmailVisualHtmlEditor'
import EmailTemplateDetailsForm, { isTemplateDetailsComplete } from './EmailTemplateDetailsForm'
import { EmailImageMediaFields, EmailVideoMediaFields } from './EmailMediaFields'
import {
  extractCategoriesList,
  buildVideoEmailHtml,
  extractYoutubeId,
  extractVimeoId,
} from '../emailBuilderApi'

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
  { id: 'heading', name: 'Heading', icon: FileText, group: 'Content' },
  { id: 'text', name: 'Text', icon: Type, group: 'Content' },
  { id: 'button', name: 'Button', icon: Square, group: 'Content' },
  { id: 'link', name: 'Link', icon: Link2, group: 'Content' },
  { id: 'image', name: 'Image', icon: ImageIcon, group: 'Media' },
  { id: 'video', name: 'Video', icon: Video, group: 'Media' },
  { id: 'columns', name: 'Columns', icon: Columns, group: 'Layout' },
  { id: 'divider', name: 'Divider', icon: Minus, group: 'Layout' },
]

const BLOCK_GROUPS = ['Content', 'Media', 'Layout']

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
    .map(([k, v]) => {
      const key = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      const value = String(v).replaceAll(';', '').replaceAll('"', '').replaceAll("'", '')
      return `${key}:${value}`
    })
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
    case 'link': {
      const href = escapeHtml(String(block.href || '#').trim() || '#')
      return `<a href="${href}" style="${style}">${contentWithBreaks || 'Link'}</a>`
    }
    case 'button': {
      const href = escapeHtml(String(block.href || '#').trim() || '#')
      const btnStyle = style || 'display:inline-block;padding:10px 14px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none'
      return `<a href="${href}" style="${btnStyle}">${contentWithBreaks || 'Button'}</a>`
    }
    case 'image': {
      const src = String(block.content || '').trim()
      const safeSrc = src ? escapeHtml(src) : ''
      return safeSrc
        ? `<img alt="Image" src="${safeSrc}" width="600" data-crm-img="1" style="${style || 'display:block;width:100%;max-width:100%;height:auto;border:0;'}"/>`
        : `<div style="${style}">[Image]</div>`
    }
    case 'video': {
      const url = String(block.href || block.content || '').trim()
      if (!url) return `<div style="${style}">[Video]</div>`
      return buildVideoEmailHtml(url, block.poster || '', style)
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
      case 'video': {
        const url = String(block.href || block.content || '').trim()
        let poster = String(block.poster || '').trim()
        if (!poster && url) {
          const yt = extractYoutubeId(url)
          const vimeo = extractVimeoId(url)
          if (yt) poster = `https://img.youtube.com/vi/${yt}/hqdefault.jpg`
          else if (vimeo) poster = `https://vumbnail.com/${vimeo}.jpg`
        }
        return (
          <div style={baseStyle} className="text-center space-y-2">
            {poster || /^https?:\/\//i.test(url) ? (
              <div className="relative inline-block max-w-full">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt=""
                    className="max-w-full h-auto max-h-48 mx-auto rounded-lg border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="w-64 h-36 bg-slate-900 rounded-lg flex items-center justify-center mx-auto" />
                )}
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900/85 ring-2 ring-white/90 shadow-lg pl-0.5">
                    <Play className="h-7 w-7 fill-white text-white" strokeWidth={0} />
                  </span>
                </span>
              </div>
            ) : (
              <div className="w-full h-40 bg-slate-100 rounded-lg flex flex-col items-center justify-center border border-slate-200 gap-2">
                <Play className="h-10 w-10 text-slate-400" />
                <span className="text-slate-500 text-xs">Video link</span>
              </div>
            )}
            {url ? <p className="text-xs text-slate-500 truncate">{url}</p> : null}
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
            <a href={block.href || '#'} className="text-brand underline" onClick={(e) => e.preventDefault()}>
              {block.content || 'Link'}
            </a>
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
      className={cn(
        'relative group rounded-xl border transition-all bg-white',
        isSelected
          ? 'border-brand ring-2 ring-brand/20 shadow-sm'
          : 'border-transparent hover:border-slate-200 hover:shadow-sm',
        isDragging && 'opacity-50',
      )}
    >
      <div className="absolute -left-11 top-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing bg-white border border-slate-200 shadow-sm"
          onClick={(e) => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5 text-slate-500" />
        </button>
        <button
          className="p-1.5 hover:bg-slate-100 rounded-lg bg-white border border-slate-200 shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate?.(block.id)
          }}
          title="Duplicate"
        >
          <Copy className="h-3.5 w-3.5 text-slate-500" />
        </button>
        <button
          className="p-1.5 hover:bg-red-50 rounded-lg bg-white border border-slate-200 shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(block.id)
          }}
          title="Remove"
        >
          <Trash2 className="h-3.5 w-3.5 text-slate-500 hover:text-red-500" />
        </button>
      </div>

      <div
        onClick={() => onSelect(block.id)}
        className="p-4 cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {block.type}
          </span>
          {isSelected ? (
            <span className="text-[10px] font-medium text-brand bg-brand/10 px-1.5 py-0.5 rounded">
              Editing
            </span>
          ) : null}
        </div>
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
        'flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl transition-all text-[11px] font-medium text-slate-700',
        'cursor-grab active:cursor-grabbing border border-slate-200/80 bg-white hover:border-brand/40 hover:bg-brand/5 hover:shadow-sm min-h-[68px]',
        isDragging && 'opacity-50 scale-95',
      )}
    >
      <span className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
        <Icon className="h-4 w-4 text-slate-600" />
      </span>
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

export default function EmailBuilderTab({ onCreated, onBack }) {
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
  const [emailBlocks, setEmailBlocks] = useState([])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [canvasView, setCanvasView] = useState('visual')
  const [htmlBody, setHtmlBody] = useState('')
  const [htmlCustomized, setHtmlCustomized] = useState(false)
  const [step, setStep] = useState('details') // 'details' | 'design'

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

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const generatedHtml = useMemo(() => blocksToHtml(emailBlocks), [emailBlocks])

  useEffect(() => {
    if (!htmlCustomized) {
      setHtmlBody(generatedHtml)
    }
  }, [generatedHtml, htmlCustomized])

  const effectiveHtmlBody = useMemo(() => {
    if (htmlCustomized) return String(htmlBody || '')
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
      content: type === 'button' ? 'Click here' : type === 'link' ? 'Learn more' : type === 'heading' ? 'Heading' : type === 'text' ? 'Write your message…' : '',
      href: type === 'button' || type === 'link' || type === 'video' ? 'https://' : undefined,
      poster: type === 'video' ? '' : undefined,
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
    setEmailBlocks([])
    setSelectedBlock(null)
    setCanvasView('visual')
    setHtmlCustomized(false)
    setHtmlBody('')
    setStep('details')
  }

  const detailsComplete = isTemplateDetailsComplete({
    locationID,
    categoryId,
    templateName,
  })

  const continueToDesign = () => {
    if (!detailsComplete) {
      toast.error({
        title: 'Missing details',
        message: 'Studio, category, and template name are required.',
      })
      return
    }
    setStep('design')
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

  const showBlockSettings = canvasView === 'visual' && !htmlCustomized && !!selectedBlockData
  const showComponentsSidebar = canvasView === 'visual' && !htmlCustomized
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

  const updateBlock = (patch) => {
    const id = patch?.id || selectedBlock
    if (!id) return
    setEmailBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch, id: b.id } : b)),
    )
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
    if (!detailsComplete) {
      toast.error({
        title: 'Missing details',
        message: 'Studio, category, and template name are required.',
      })
      setStep('details')
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
        body: templateDescription.trim() || null,
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

  if (step === 'details') {
    return (
      <TabsContent value="builder" className="mt-4">
        <div className="flex items-center justify-center px-2 py-2 md:py-4">
          <div className="w-full max-w-7xl">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-0.5">
              <div>
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to templates
                </button>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
                  New template · Step 1 of 2
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 mt-0.5">
                  Template details
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Then design with blocks or paste HTML
              </p>
            </div>
            <Card className="border-slate-200/80 shadow-md overflow-hidden rounded-2xl">
              <CardContent className="p-4 md:p-5">
                <EmailTemplateDetailsForm
                  locationID={locationID}
                  setLocationID={setLocationID}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                  categories={locationScopedCategories}
                  templateName={templateName}
                  setTemplateName={setTemplateName}
                  templateDescription={templateDescription}
                  setTemplateDescription={setTemplateDescription}
                  showContinue
                  onContinue={continueToDesign}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="builder" className="mt-3">
      <div className="h-[calc(100vh-148px)] flex flex-col">
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to templates
          </button>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
            {showComponentsSidebar && (
              <div className="col-span-3 flex flex-col min-h-0 self-stretch">
                <Card className="flex flex-col flex-1 min-h-0 h-full border-slate-200/80 shadow-sm">
                  <CardHeader className="flex-shrink-0 border-b py-2 px-3">
                    <CardTitle className="text-sm font-semibold">Blocks</CardTitle>
                  </CardHeader>
                  <CardContent
                    className="overflow-y-auto flex-1 pb-3 min-h-0 p-3 space-y-4"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {BLOCK_GROUPS.map((group) => (
                      <div key={group} className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-0.5">
                          {group}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {contentBlocks
                            .filter((b) => b.group === group)
                            .map((block) => (
                              <DraggableContentBlock
                                key={block.id}
                                block={block}
                                onClick={(b) => addBlock(b.id)}
                              />
                            ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            <div
              className={cn(
                'flex flex-col min-h-0 transition-all duration-200',
                mainColSpan === 12 ? 'col-span-12' : mainColSpan === 6 ? 'col-span-6' : 'col-span-9',
              )}
            >
              <Card className="flex flex-col flex-1 min-h-0 border-slate-200/80 shadow-sm overflow-hidden">
                <CardHeader className="flex-shrink-0 border-b py-2 px-3 bg-white">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <EmailCanvasModeTabs
                      value={canvasView}
                      onChange={setCanvasView}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1 hidden md:block">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {templateName.trim() || 'Untitled template'}
                      </p>
                    </div>
                    {htmlCustomized && canvasView === 'visual' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs shrink-0 hidden sm:inline-flex"
                        onClick={syncHtmlFromVisual}
                        title="Discard custom HTML and regenerate from blocks"
                      >
                        Reset to blocks
                      </Button>
                    ) : null}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStep('details')}
                        className="h-8"
                      >
                        <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={saveTemplate}
                        disabled={saving}
                        className="h-8"
                      >
                        <Send className="h-3.5 w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent
                  className="flex-1 min-h-0 flex flex-col px-3 pt-2 pb-3 overflow-hidden bg-slate-50/40"
                  style={{ overscrollBehavior: 'contain' }}
                >
                  <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden">
                    {canvasView === 'visual' && htmlCustomized && (
                      <EmailVisualHtmlEditor
                        html={htmlBody}
                        onChange={(value) => {
                          setHtmlBody(value)
                          setHtmlCustomized(true)
                        }}
                        className="h-full min-h-[calc(100vh-220px)]"
                      />
                    )}

                    {canvasView === 'visual' && !htmlCustomized && (
                      <DroppableEmailCanvas
                        isEmpty={emailBlocks.length === 0}
                        onCanvasClick={clearBlockSelection}
                        className="min-h-[calc(100vh-220px)] w-full"
                      >
                        {emailBlocks.length === 0 ? (
                          <div className="text-center py-10 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white">
                            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3">
                              <Mail className="h-6 w-6 text-slate-300" />
                            </div>
                            <p className="text-slate-800 text-sm font-semibold">Start your email</p>
                            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                              Drag blocks from the left, or paste HTML.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => addBlock('heading')}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Add heading
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => setCanvasView('html')}
                              >
                                <Code2 className="h-3.5 w-3.5 mr-1.5" />
                                Paste HTML
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/90">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-400/90" />
                                <span className="h-2 w-2 rounded-full bg-amber-400/90" />
                                <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
                                <span className="text-[11px] text-slate-500 ml-1">Email canvas</span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Click a block to edit · drag to reorder
                              </span>
                            </div>
                            <div
                              className="space-y-2 pl-12 pr-4 py-4 relative min-h-[240px] max-w-[720px] mx-auto"
                              onClick={(e) => {
                                if (e.target === e.currentTarget) clearBlockSelection()
                              }}
                            >
                              <SortableContext
                                items={emailBlocks.map((b) => b.id)}
                                strategy={verticalListSortingStrategy}
                              >
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
                        onOpenDesign={() => setCanvasView('visual')}
                        layout="editor-only"
                        className="h-full min-h-[calc(100vh-220px)]"
                      />
                    )}

                    {canvasView === 'preview' && (
                      <EmailPreviewFrame
                        html={effectiveHtmlBody}
                        subject={templateName}
                        emptyMessage="Nothing to preview yet"
                        emptyHint="Add blocks in Design, or paste HTML, then come back here."
                        emptyActionLabel="Go to Design"
                        onEmptyAction={() => setCanvasView('visual')}
                        fullWidth
                        className="h-full min-h-[calc(100vh-220px)]"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {showBlockSettings && selectedBlockData && (
              <div className="col-span-3 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 min-h-0 border-brand/25 shadow-md overflow-hidden">
                  <CardHeader className="flex-shrink-0 border-b pb-3 bg-gradient-to-r from-brand/5 to-transparent">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand/80">
                          Inspector
                        </p>
                        <CardTitle className="text-base capitalize mt-0.5">
                          {selectedBlockData.type}
                        </CardTitle>
                      </div>
                      <button
                        type="button"
                        onClick={clearBlockSelection}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Close"
                        aria-label="Close block settings"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent
                    className="overflow-y-auto flex-1 pb-3 min-h-0"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    <div className="space-y-4">
                      {selectedBlockData.type === 'image' ? (
                        <EmailImageMediaFields
                          value={selectedBlockData.content}
                          onChange={(url) => updateBlock({ id: selectedBlockData.id, content: url })}
                        />
                      ) : selectedBlockData.type === 'video' ? (
                        <EmailVideoMediaFields
                          url={selectedBlockData.href || selectedBlockData.content || ''}
                          poster={selectedBlockData.poster || ''}
                          onUrlChange={(url) =>
                            updateBlock({ id: selectedBlockData.id, href: url, content: url })
                          }
                          onPosterChange={(poster) =>
                            updateBlock({ id: selectedBlockData.id, poster })
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs">Content</Label>
                          <Textarea
                            value={selectedBlockData.content}
                            onChange={(e) =>
                              updateBlock({ id: selectedBlockData.id, content: e.target.value })
                            }
                            rows={4}
                            className="text-sm"
                          />
                        </div>
                      )}

                      {(selectedBlockData.type === 'button' || selectedBlockData.type === 'link') && (
                        <div className="space-y-2">
                          <Label className="text-xs">Link URL</Label>
                          <Input
                            value={selectedBlockData.href || ''}
                            onChange={(e) =>
                              updateBlock({ id: selectedBlockData.id, href: e.target.value })
                            }
                            placeholder="https://"
                            className="text-sm"
                          />
                        </div>
                      )}

                      <StylePanel
                        field={stylePanelField}
                        onStyleChange={(updated) =>
                          updateBlock({
                            id: selectedBlockData.id,
                            styles: updated.styles || {},
                          })
                        }
                        onFieldUpdate={(updated) => {
                          const isMedia =
                            selectedBlockData.type === 'image' ||
                            selectedBlockData.type === 'video'
                          updateBlock({
                            id: selectedBlockData.id,
                            ...(isMedia
                              ? {}
                              : { content: updated.label ?? selectedBlockData.content }),
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
              <div className="p-3 rounded-xl border border-brand/40 bg-white shadow-xl">
                {String(activeId).startsWith('block-type-') ? (
                  (() => {
                    const block = contentBlocks.find((bt) => `block-type-${bt.id}` === String(activeId))
                    const Icon = block?.icon
                    return (
                      <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                        {Icon && (
                          <span className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-brand" />
                          </span>
                        )}
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

