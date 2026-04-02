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
  Send,
  Square,
  Trash2,
  Type,
} from 'lucide-react'
import { TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import StylePanel from '@/components/forms/StylePanel'
import api from '@/lib/api'

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
  const body = blocks.map(blockToHtml).join('\n')
  return `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">${body}</div>`
}

function blocksToPlainText(blocks = []) {
  return blocks
    .filter((b) => b.type === 'heading' || b.type === 'text' || b.type === 'link' || b.type === 'button')
    .map((b) => String(b.content || '').trim())
    .filter(Boolean)
    .join('\n\n')
}

function SortableEmailBlock({ block, isSelected, onSelect, onRemove }) {
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
      case 'image':
        return (
          <div style={baseStyle} className="text-center">
            <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
              <ImageIcon className="h-10 w-10 text-slate-400" />
              <span className="ml-2 text-slate-500 text-sm">Image</span>
            </div>
            {block.content ? <p className="text-xs text-slate-500 mt-2 truncate">{block.content}</p> : null}
          </div>
        )
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
      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm font-medium text-slate-700 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Icon className="h-5 w-5 text-slate-600" />
      <span className="text-left flex-1">{block.name}</span>
    </button>
  )
}

function DroppableEmailCanvas({ children, isEmpty }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'email-canvas', data: { type: 'canvas' } })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[500px] transition-colors ${
        isOver ? 'bg-brand/10 border-2 border-brand-light border-dashed' : ''
      } ${isEmpty ? 'border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center' : ''}`}
    >
      {children}
    </div>
  )
}

export default function EmailBuilderTab({ onCreated }) {
  const toast = useToast()

  const [to, setTo] = useState('')
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState('')
  // Per backend contract:
  // - `subject` is used as the template "name"
  // - `body` is used as the template "description"
  // - `htmlBody` is the actual email content
  const [templateName, setTemplateName] = useState('Welcome to Dance Academy')
  const [templateDescription, setTemplateDescription] = useState("Hello! We're excited to have you.")
  const [emailBlocks, setEmailBlocks] = useState([
    { id: '1', type: 'heading', content: 'Welcome!', styles: {} },
    { id: '2', type: 'text', content: "Hi {{name}},\n\nWe're excited to have you.", styles: {} },
  ])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchCategories = useCallback(async () => {
    const result = await api.get('/api/emailBuilder/category')
    const list = result.data?.categories ?? result.data
    if (result.success && Array.isArray(list)) {
      setCategories(list)
      setCategoryId((prev) => (prev || (list.length > 0 ? list[0]._id : '')))
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addBlock = (type) => {
    const bt = contentBlocks.find((b) => b.id === type)
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: bt?.name || `New ${type}`,
      styles: {},
    }
    setEmailBlocks((prev) => [...prev, newBlock])
    setSelectedBlock(newBlock.id)
  }

  const removeBlock = (id) => {
    setEmailBlocks((prev) => prev.filter((b) => b.id !== id))
    if (selectedBlock === id) setSelectedBlock(null)
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
    if (!categoryId) {
      toast.error({ title: 'Missing category', message: 'Please select a category.' })
      return
    }
    if (emailBlocks.length === 0) {
      toast.error({ title: 'Empty email', message: 'Add at least one block.' })
      return
    }
    setSaving(true)
    try {
      const htmlBody = blocksToHtml(emailBlocks)
      const payload = {
        categoryID: categoryId,
        subject: templateName.trim(),
        body: templateDescription.trim(),
        htmlBody,
      }
      const result = await api.post('/api/emailBuilder/', payload)
      if (!result.success) {
        toast.error({ title: 'Create failed', message: result.error || 'Could not create email template.' })
        return
      }
      toast.success({ title: 'Created', message: 'Email template created successfully.' })
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
            {/* Components */}
            <div className="col-span-3 flex flex-col min-h-0 self-stretch">
              <Card className="flex flex-col flex-1 min-h-0" style={{ height: 'calc(100% + 30px)' }}>
                <CardHeader className="flex-shrink-0 border-b">
                  <CardTitle className="text-base">Components</CardTitle>
                  <p className="text-sm text-slate-500">Drag to add or click to insert</p>
                </CardHeader>
                <CardContent className="space-y-1 overflow-y-auto flex-1 pb-2 min-h-0" style={{ overscrollBehavior: 'contain' }}>
                  {contentBlocks.map((block) => (
                    <DraggableContentBlock
                      key={block.id}
                      block={block}
                      onClick={(b) => addBlock(b.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Canvas */}
            <div className="col-span-6 flex flex-col min-h-0">
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="flex-shrink-0 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Email Preview</CardTitle>
                    <Button variant="gradient" size="sm" onClick={saveTemplate} disabled={saving}>
                      <Send className="h-4 w-4 mr-2" />
                      {saving ? 'Saving…' : 'Save template'}
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Select a category…</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Template name</Label>
                      <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Welcome to Dance Academy" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Template description</Label>
                      <Textarea
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        rows={3}
                        placeholder="Hello! We're excited to have you."
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="overflow-y-auto flex-1 pb-2 min-h-0" style={{ overscrollBehavior: 'contain', padding: '8px' }}>
                  <DroppableEmailCanvas isEmpty={emailBlocks.length === 0}>
                    {emailBlocks.length === 0 ? (
                      <div className="text-center py-12">
                        <Mail className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 text-sm">Drag components here or click to add</p>
                      </div>
                    ) : (
                      <div className="space-y-4 pl-10">
                        <SortableContext items={emailBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                          {emailBlocks.map((block) => (
                            <SortableEmailBlock
                              key={block.id}
                              block={block}
                              isSelected={selectedBlock === block.id}
                              onSelect={setSelectedBlock}
                              onRemove={removeBlock}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    )}
                  </DroppableEmailCanvas>
                </CardContent>
              </Card>
            </div>

            {/* Properties */}
            <div className="col-span-3 flex flex-col min-h-0">
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="flex-shrink-0 border-b">
                  <CardTitle className="text-base">{selectedBlockData ? 'Block Settings' : 'Properties'}</CardTitle>
                  {selectedBlockData && (
                    <p className="text-sm text-slate-500 capitalize">{selectedBlockData.type} block</p>
                  )}
                </CardHeader>
                <CardContent className="overflow-y-auto flex-1 pb-2 min-h-0" style={{ overscrollBehavior: 'contain' }}>
                  {selectedBlockData ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Content</Label>
                        <Textarea
                          value={selectedBlockData.content}
                          onChange={(e) => updateBlock({ ...selectedBlockData, content: e.target.value })}
                          rows={4}
                          className="text-sm"
                        />
                      </div>

                      {/* Keep the original style panel UX */}
                      <StylePanel
                        field={stylePanelField}
                        onStyleChange={(updated) => updateBlock({ ...selectedBlockData, styles: updated.styles || {} })}
                        onFieldUpdate={(updated) => {
                          // StylePanel uses `label` as the main content field; map back.
                          updateBlock({ ...selectedBlockData, content: updated.label ?? selectedBlockData.content, styles: updated.styles || {} })
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <div className="mb-3 text-4xl">⚙️</div>
                      <p className="text-sm">Select a block to edit</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

