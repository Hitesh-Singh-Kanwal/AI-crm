'use client'

import { Suspense, useState } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Mail, Plus, Eye, Send, Sparkles, Image, Link2, Type, Columns, Minus, Trash2, GripVertical, FileText, Square } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { emailTemplates } from '@/data/dummyData'
import StylePanel from '@/components/forms/StylePanel'
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
  { id: 'text', name: 'Text', icon: Type },
  { id: 'image', name: 'Image', icon: Image },
  { id: 'button', name: 'Button', icon: Square },
  { id: 'link', name: 'Link', icon: Link2 },
  { id: 'columns', name: 'Columns', icon: Columns },
  { id: 'divider', name: 'Divider', icon: Minus },
  { id: 'heading', name: 'Heading', icon: FileText },
]

const templateContent = {
  e1: {
    subject: 'Welcome to Dance Academy!',
    preview: 'Start your dance journey today',
    blocks: [
      { id: '1', type: 'heading', content: 'Welcome to Dance Academy!', styles: {} },
      { id: '2', type: 'text', content: 'Hello {{name}},\n\nWelcome to our dance academy!', styles: {} },
    ],
  },
  e2: {
    subject: 'Class Reminder: {{class}}',
    preview: 'Your class starts soon',
    blocks: [
      { id: '1', type: 'heading', content: 'Class Reminder', styles: {} },
      { id: '2', type: 'text', content: 'Hi {{name}},\n\nThis is a reminder for your {{class}} class.', styles: {} },
    ],
  },
}

// Sortable Email Block Component
function SortableEmailBlock({ block, isSelected, onSelect, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const blockStyles = block.styles || {}

  const getBlockStyle = () => {
    const style = {
      fontWeight: blockStyles.fontWeight,
      color: blockStyles.color,
      backgroundColor: blockStyles.backgroundColor,
      padding: `${blockStyles.paddingTop || '1rem'} ${blockStyles.paddingRight || '1rem'} ${blockStyles.paddingBottom || '1rem'} ${blockStyles.paddingLeft || '1rem'}`,
    }
    if (blockStyles.fontFamily) {
      style.fontFamily = blockStyles.fontFamily
    }
    if (blockStyles.fontSize) {
      style.fontSize = blockStyles.fontSize
    }
    if (blockStyles.textAlign) {
      style.textAlign = blockStyles.textAlign
    }
    if (blockStyles.letterSpacing) {
      style.letterSpacing = blockStyles.letterSpacing
    }
    if (blockStyles.textTransform) {
      style.textTransform = blockStyles.textTransform
    }
    return style
  }

  const renderBlock = () => {
    switch (block.type) {
      case 'heading':
        return (
          <h2 style={getBlockStyle()} className="text-2xl font-bold">
            {block.content || 'Heading'}
          </h2>
        )
      case 'text':
        return (
          <p style={getBlockStyle()} className="text-base">
            {block.content || 'Text content'}
          </p>
        )
      case 'image':
        return (
          <div style={getBlockStyle()} className="text-center">
            <div className="w-full h-48 bg-slate-200 rounded-lg flex items-center justify-center">
              <Image className="h-12 w-12 text-slate-400" />
              <span className="ml-2 text-slate-500">Image</span>
            </div>
          </div>
        )
      case 'button':
        return (
          <div style={getBlockStyle()} className="text-center">
            <Button variant="gradient" style={{ backgroundColor: blockStyles.buttonColor || '#3b82f6' }}>
              {block.content || 'Button'}
            </Button>
          </div>
        )
      case 'link':
        return (
          <div style={getBlockStyle()}>
            <a href="#" className="text-brand underline">
              {block.content || 'Link'}
            </a>
          </div>
        )
      case 'divider':
        return (
          <div style={getBlockStyle()}>
            <hr className="border-slate-300" />
          </div>
        )
      case 'columns':
        return (
          <div style={getBlockStyle()} className="grid grid-cols-2 gap-4">
            <div className="bg-slate-100 p-4 rounded">Column 1</div>
            <div className="bg-slate-100 p-4 rounded">Column 2</div>
          </div>
        )
      default:
        return <div style={getBlockStyle()}>{block.content || 'Block'}</div>
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${
        isSelected
          ? 'ring-2 ring-brand ring-offset-2'
          : 'hover:bg-slate-50'
      } rounded-lg transition-all`}
    >
      {/* Control buttons - only show on hover */}
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
      
      <div 
        onClick={() => onSelect(block.id)}
        className="p-4 cursor-pointer"
      >
        {renderBlock()}
      </div>
    </div>
  )
}

// Draggable Content Block Component
function DraggableContentBlock({ block, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-type-${block.id}`,
    data: {
      type: 'blockType',
      block,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const IconComponent = block.icon

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(block)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm font-medium text-slate-700 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <IconComponent className="h-5 w-5 text-slate-600" />
      <span className="text-left flex-1">{block.name}</span>
    </button>
  )
}

// Droppable Email Canvas
function DroppableEmailCanvas({ children, isEmpty }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'email-canvas',
    data: {
      type: 'canvas',
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[500px] transition-colors ${
        isOver ? 'bg-brand/10 border-2 border-brand-light border-dashed' : ''
      } ${
        isEmpty ? 'border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center' : ''
      }`}
    >
      {children}
    </div>
  )
}

function EmailsPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('view') || 'templates'
  const [subject, setSubject] = useState('Welcome to Dance Academy!')
  const [previewText, setPreviewText] = useState('Start your dance journey today')
  const [emailBlocks, setEmailBlocks] = useState([
    { id: '1', type: 'heading', content: 'Welcome to Dance Academy!', styles: {} },
    { id: '2', type: 'text', content: 'Hello {{name}},\n\nWelcome to our dance academy!', styles: {} },
  ])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addBlock = (type) => {
    const blockType = contentBlocks.find(bt => bt.id === type)
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: blockType?.name || `New ${type} block`,
      styles: {},
    }
    setEmailBlocks([...emailBlocks, newBlock])
    setSelectedBlock(newBlock.id)
  }

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const applyTemplate = (templateId) => {
    const content = templateContent[templateId]
    if (!content) return
    setSubject(content.subject)
    setPreviewText(content.preview)
    if (content.blocks) {
      setEmailBlocks(content.blocks)
      setSelectedBlock(content.blocks[0]?.id || null)
    }
    setActiveTab('builder')
  }

  const removeBlock = (id) => {
    setEmailBlocks(emailBlocks.filter((b) => b.id !== id))
    if (selectedBlock === id) setSelectedBlock(null)
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    // Handle dropping block types from left panel to canvas
    if (active.id.toString().startsWith('block-type-')) {
      const blockTypeId = active.id.toString().replace('block-type-', '')
      const blockType = contentBlocks.find((bt) => bt.id === blockTypeId)
      
      if (blockType) {
        addBlock(blockType.id)
      }
      setActiveId(null)
      return
    }

    // Handle reordering existing blocks
    if (active.id !== over.id) {
      const activeIndex = emailBlocks.findIndex((item) => item.id === active.id)
      const overIndex = emailBlocks.findIndex((item) => item.id === over.id)
      
      if (activeIndex !== -1 && overIndex !== -1) {
        setEmailBlocks((items) => arrayMove(items, activeIndex, overIndex))
      }
    }

    setActiveId(null)
  }

  const handleBlockUpdate = (updatedBlock) => {
    setEmailBlocks(
      emailBlocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
    )
  }

  const selectedBlockData = emailBlocks.find((b) => b.id === selectedBlock)

  return (
    <MainLayout title="Email Builder" subtitle="Create and send beautiful email campaigns">
      {/* Templates View */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-600">Browse email templates</p>
            <Button variant="gradient" onClick={() => setActiveTab('builder')}>

              <Plus className="h-4 w-4 mr-2" />
              Create New Email
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {emailTemplates.map((template, index) => (
              <Card
                key={template.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Mail className="h-8 w-8 text-slate-600" />
                    <Badge variant={template.status === 'Active' ? 'success' : 'warning'} className="text-xs">
                      {template.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-base font-semibold text-slate-900">{template.name}</CardTitle>
                  <Badge variant="outline" className="mt-2 w-fit text-xs border-slate-200">
                    {template.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Opens:</span>
                      <span className="font-medium">{template.opens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Clicks:</span>
                      <span className="font-medium">{template.clicks}</span>
                    </div>
                    {template.lastUsed && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last used:</span>
                        <span className="font-medium">{template.lastUsed}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="gradient" size="sm" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => applyTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Builder View */}
      {activeTab === 'builder' && (
        <div className="h-[calc(100vh-200px)] flex flex-col">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
              {/* Content Blocks Panel */}
              <div className="col-span-3 flex flex-col min-h-0 self-stretch">
                <Card className="flex flex-col flex-1 min-h-0" style={{ height: 'calc(100% + 30px)' }}>
                  <CardHeader className="flex-shrink-0 border-b">
                    <CardTitle className="text-base">Components</CardTitle>
                    <p className="text-sm text-slate-500">Drag to add or click to insert</p>
                  </CardHeader>
                  <CardContent 
                    className="space-y-1 overflow-y-auto flex-1 pb-2 min-h-0"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {contentBlocks.map((block) => (
                      <DraggableContentBlock
                        key={block.id}
                        block={block}
                        onClick={(block) => addBlock(block.id)}
                      />
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Email Canvas */}
              <div className="col-span-6 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="flex-shrink-0 border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Email Preview</CardTitle>
                      
                    </div>
                    <div className="mt-4 space-y-2">
                      <div>
                        <Label className="text-xs">Subject Line</Label>
                        <Input
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Enter subject line"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Preview Text</Label>
                        <Input
                          value={previewText}
                          onChange={(e) => setPreviewText(e.target.value)}
                          placeholder="Text shown in inbox preview"
                          className="mt-1"
                        />

                      </div>
                    </div>
                  </CardHeader>
                  <CardContent 
                    className="overflow-y-auto flex-1 pb-2 min-h-0"
                    style={{ overscrollBehavior: 'contain', padding: '8px' }}
                  >
                    <DroppableEmailCanvas isEmpty={emailBlocks.length === 0}>
                      {emailBlocks.length === 0 ? (
                        <div className="text-center py-12">
                          <Mail className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                          <p className="text-slate-500 text-sm">
                            Drag components here or click to add
                          </p>
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

              {/* Block Settings Panel */}
              <div className="col-span-3 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="flex-shrink-0 border-b">
                    <CardTitle className="text-base">
                      {selectedBlockData ? 'Block Settings' : 'Properties'}
                    </CardTitle>
                    {selectedBlockData && (
                      <p className="text-sm text-slate-500 capitalize">{selectedBlockData.type} block</p>
                    )}
                  </CardHeader>
                  <CardContent 
                    className="overflow-y-auto flex-1 pb-2 min-h-0"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {selectedBlockData ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Content</Label>
                          <Textarea
                            value={selectedBlockData.content}
                            onChange={(e) => handleBlockUpdate({ ...selectedBlockData, content: e.target.value })}
                            rows={4}
                            className="text-sm"
                          />
                        </div>
                        <StylePanel
                          field={selectedBlockData}
                          onStyleChange={handleBlockUpdate}
                          onFieldUpdate={handleBlockUpdate}
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

                {selectedBlockData && (
                  <div className="mt-4 space-y-2 flex-shrink-0">
                    <Button variant="gradient" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Email
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Send className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="p-4 rounded-lg border-2 border-brand bg-white shadow-xl">
                  {activeId.toString().startsWith('block-type-') ? (
                    (() => {
                      const block = contentBlocks.find((bt) => `block-type-${bt.id}` === activeId.toString())
                      const IconComponent = block?.icon
                      return (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          {IconComponent && <IconComponent className="h-5 w-5 text-slate-600" />}
                          <span>{block?.name}</span>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-sm font-medium text-slate-700">
                      {emailBlocks.find(b => b.id === activeId)?.content || 'Moving block...'}
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Analytics View */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Sent</p>
                  <h3 className="text-3xl font-bold mt-2">12,456</h3>
                  <p className="text-xs text-green-600 mt-2">+8.2% vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Opened</p>
                  <h3 className="text-3xl font-bold mt-2">8,234</h3>
                  <p className="text-xs text-slate-500 mt-2">66.1% open rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Clicked</p>
                  <h3 className="text-3xl font-bold mt-2">2,891</h3>
                  <p className="text-xs text-slate-500 mt-2">23.2% click rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Bounced</p>
                  <h3 className="text-3xl font-bold mt-2">145</h3>
                  <p className="text-xs text-slate-500 mt-2">1.2% bounce rate</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </MainLayout>
  )
}

export default function EmailsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="Email Builder" subtitle="Create and send beautiful email campaigns">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
          </div>
        </MainLayout>
      }
    >
      <EmailsPageInner />
    </Suspense>
  )
}
