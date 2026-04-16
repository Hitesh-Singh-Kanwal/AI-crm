'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Plus, FileText, BarChart3, Eye, Copy, Trash2, Sparkles, GripVertical, Type, Mail, Phone, CheckSquare, Calendar, ChevronDown, Paperclip, Star, Download, Heart, X } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import api from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import Switch from '@/components/ui/switch'
import { formatDate } from '@/lib/utils'
import StylePanel from '@/components/forms/StylePanel'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { getCurrentUser } from '@/lib/auth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

const fieldTypes = [
  { id: 'text', name: 'Text Input', icon: Type },
  { id: 'email', name: 'Email', icon: Mail },
  { id: 'phone', name: 'Phone', icon: Phone },
  { id: 'textarea', name: 'Text Area', icon: FileText },
  { id: 'checkbox', name: 'Checkbox', icon: CheckSquare },
  { id: 'date', name: 'Date Picker', icon: Calendar },
  { id: 'select', name: 'Dropdown', icon: ChevronDown },
  { id: 'file', name: 'File Upload', icon: Paperclip },
  { id: 'rating', name: 'Rating', icon: Star },
]

const templateFields = {
  f1: [
    { id: 't1', type: 'text', label: 'Student Name', placeholder: 'Full name', required: true },
    { id: 't2', type: 'email', label: 'Parent Email', placeholder: 'parent@email.com', required: true },
    { id: 't3', type: 'phone', label: 'Phone Number', placeholder: '(555) 123-4567', required: true },
    { id: 't4', type: 'date', label: 'Date of Birth', placeholder: '', required: true },
  ],
  f2: [
    { id: 't1', type: 'text', label: 'Student Name', placeholder: 'Full name', required: true },
    { id: 't2', type: 'email', label: 'Email', placeholder: 'you@email.com', required: true },
    { id: 't3', type: 'select', label: 'Class Type', placeholder: '', required: true },
  ],
  f3: [
    { id: 't1', type: 'text', label: 'Parent Name', placeholder: 'Full name', required: true },
    { id: 't2', type: 'checkbox', label: 'Liability Consent', placeholder: 'I agree to the terms', required: true },
  ],
  f4: [
    { id: 't1', type: 'rating', label: 'Overall Rating', placeholder: '', required: true },
    { id: 't2', type: 'textarea', label: 'Feedback', placeholder: 'Share your feedback', required: false },
  ],
}

// Sortable Field Item Component
function SortableFieldItem({ field, isSelected, onSelect, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const fieldStyles = field.styles || {}

  const getInputStyle = () => {
    return {
      backgroundColor: fieldStyles.backgroundColor,
      padding: `${fieldStyles.paddingTop || '0.5rem'} ${fieldStyles.paddingRight || '0.75rem'} ${fieldStyles.paddingBottom || '0.5rem'} ${fieldStyles.paddingLeft || '0.75rem'}`,
      borderWidth: fieldStyles.borderWidth || '1px',
      borderStyle: fieldStyles.borderStyle || 'solid',
      borderColor: fieldStyles.borderColor || '#e2e8f0',
      borderRadius: fieldStyles.borderRadius || '0.375rem',
      width: fieldStyles.width || '100%',
    }
  }

  const getLabelStyle = () => {
    const style = {
      fontWeight: fieldStyles.fontWeight || '500',
      color: fieldStyles.color || '#334155',
    }
    if (fieldStyles.fontSize) {
      style.fontSize = fieldStyles.fontSize
    } else {
      style.fontSize = '0.875rem'
    }
    if (fieldStyles.fontFamily) {
      style.fontFamily = fieldStyles.fontFamily
    }
    if (fieldStyles.letterSpacing) {
      style.letterSpacing = fieldStyles.letterSpacing
    }
    if (fieldStyles.textAlign) {
      style.textAlign = fieldStyles.textAlign
    }
    if (fieldStyles.textTransform) {
      style.textTransform = fieldStyles.textTransform
    }
    return style
  }

  const containerStyle = {
    margin: `${fieldStyles.marginTop || '0'} ${fieldStyles.marginRight || '0'} ${fieldStyles.marginBottom || '0'} ${fieldStyles.marginLeft || '0'}`,
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
          className={`p-1.5 rounded bg-white border border-slate-200 shadow-sm ${
            field.locked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            if (field.locked) return
            onRemove(field.id)
          }}
          title={field.locked ? 'This field is required' : 'Remove field'}
          disabled={field.locked}
        >
          <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
        </button>
      </div>
      
      <div 
        onClick={() => onSelect(field.id)}
        className="p-4 cursor-pointer"
        style={containerStyle}
      >
        <Label className="block mb-2" style={getLabelStyle()}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {field.type === 'textarea' ? (
          <textarea
            placeholder={field.placeholder}
            className="w-full resize-none focus:outline-none focus:ring-2 focus:ring-brand"
            style={getInputStyle()}
            rows={3}
            disabled
          />
        ) : field.type === 'select' ? (
          <select
            className="w-full focus:outline-none focus:ring-2 focus:ring-brand"
            style={getInputStyle()}
            disabled
            defaultValue=""
          >
            <option value="">Select an option</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value || opt.label} value={opt.value || opt.label}>
                {opt.label || opt.value}
              </option>
            ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <div className="flex flex-col gap-2">
            {(field.options && field.options.length > 0) ? (
              field.options.map((opt) => (
                <div key={opt.value || opt.label} className="flex items-center gap-2">
                  <input type="checkbox" disabled className="h-4 w-4 text-brand" />
                  <span className="text-sm text-slate-600">{opt.label || opt.value}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <input type="checkbox" disabled className="h-4 w-4 text-brand" />
                <span className="text-sm text-slate-600">{field.placeholder || 'Checkbox option'}</span>
              </div>
            )}
          </div>
        ) : field.type === 'rating' ? (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-2xl" style={{ color: '#cbd5e1' }}>★</span>
            ))}
          </div>
        ) : (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            disabled
            className="focus:outline-none focus:ring-2 focus:ring-brand"
            style={getInputStyle()}
          />
        )}
      </div>
    </div>
  )
}

// Draggable Field Type Component
function DraggableFieldType({ fieldType, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `field-type-${fieldType.id}`,
    data: {
      type: 'fieldType',
      fieldType,
    },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const IconComponent = fieldType.icon

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(fieldType)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm font-medium text-slate-700 cursor-grab active:cursor-grabbing border border-transparent hover:border-slate-200 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <IconComponent className="h-5 w-5 text-slate-600" />
      <span className="text-left flex-1">{fieldType.name}</span>
    </button>
  )
}

// Droppable Canvas Area
function DroppableCanvas({ children, isEmpty }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'form-canvas',
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

function FormsPageInner() {
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('view') || 'templates'
  const user = getCurrentUser()

  // Forms list (templates view)
  const [forms, setForms] = useState([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [formsError, setFormsError] = useState(null)
  const [formsPage, setFormsPage] = useState(1)
  const [formsTotalPages, setFormsTotalPages] = useState(1)
  const [formsTotalCount, setFormsTotalCount] = useState(0)
  const [formsSearch, setFormsSearch] = useState('')
  const [formsSearchDebounced, setFormsSearchDebounced] = useState('')
  const [heartAnimIds, setHeartAnimIds] = useState(new Set())
  const [togglingIds, setTogglingIds] = useState(new Set())

  const FORMS_PAGE_SIZE = 9

  useEffect(() => {
    const t = setTimeout(() => setFormsSearchDebounced(formsSearch), 300)
    return () => clearTimeout(t)
  }, [formsSearch])

  useEffect(() => {
    setFormsPage(1)
  }, [formsSearchDebounced])

  const fetchForms = useCallback(async () => {
    setFormsLoading(true)
    setFormsError(null)
    try {
      const params = new URLSearchParams({ page: String(formsPage), limit: String(FORMS_PAGE_SIZE) })
      if (formsSearchDebounced.trim()) params.set('search', formsSearchDebounced.trim())
      const result = await api.get(`/api/formBuilder?${params.toString()}`)
      const list = Array.isArray(result.data) ? result.data : null
      if (result.success && list) {
        const pagination = result.data?.pagination ?? result.pagination
        const total = pagination?.total ?? list.length
        const nextTotalPages = Math.max(1, Math.ceil(total / FORMS_PAGE_SIZE))
        if (formsPage > nextTotalPages) {
          setFormsPage(nextTotalPages)
          return
        }
        setForms(list)
        setFormsTotalCount(total)
        setFormsTotalPages(nextTotalPages)
      } else {
        setFormsError(result.error || 'Failed to fetch forms')
      }
    } catch (e) {
      setFormsError('Failed to fetch forms')
    } finally {
      setFormsLoading(false)
    }
  }, [formsPage, formsSearchDebounced])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  const toggleFormFavorite = async (form) => {
    if (togglingIds.has(form._id)) return
    setTogglingIds((prev) => new Set(prev).add(form._id))
    setHeartAnimIds((prev) => new Set(prev).add(form._id))
    setTimeout(() => {
      setHeartAnimIds((prev) => {
        const s = new Set(prev)
        s.delete(form._id)
        return s
      })
    }, 400)
    const next = !form.isFavorite
    setForms((prev) => prev.map((f) => (f._id === form._id ? { ...f, isFavorite: next } : f)))
    try {
      const result = await api.put(`/api/formBuilder/${form._id}`, { isFavorite: next })
      if (!result.success) setForms((prev) => prev.map((f) => (f._id === form._id ? { ...f, isFavorite: !next } : f)))
    } catch {
      setForms((prev) => prev.map((f) => (f._id === form._id ? { ...f, isFavorite: !next } : f)))
    } finally {
      setTogglingIds((prev) => {
        const s = new Set(prev)
        s.delete(form._id)
        return s
      })
    }
  }

  const toggleFormStatus = async (form) => {
    if (togglingIds.has(form._id)) return
    setTogglingIds((prev) => new Set(prev).add(form._id))
    const next = form.status === 'active' ? 'inactive' : 'active'
    setForms((prev) => prev.map((f) => (f._id === form._id ? { ...f, status: next } : f)))
    try {
      const result = await api.put(`/api/formBuilder/${form._id}`, { status: next })
      if (!result.success) setForms((prev) => prev.map((f) => (f._id === form._id ? { ...f, status: form.status } : f)))
    } catch {
      setForms((prev) => prev.map((f) => (f._id === form._id ? { ...f, status: form.status } : f)))
    } finally {
      setTogglingIds((prev) => {
        const s = new Set(prev)
        s.delete(form._id)
        return s
      })
    }
  }

  const [gaViews, setGaViews] = useState({ allTime: 0, last30Days: 0, last7Days: 0 })
  const [gaActiveUsers, setGaActiveUsers] = useState({ allTime: 0, last30Days: 0, last7Days: 0 })
  const [gaPages, setGaPages] = useState({ allTime: [], last30Days: [], last7Days: [] })
  const [gaPagesRange, setGaPagesRange] = useState('last30Days')
  const [gaPagesDimension, setGaPagesDimension] = useState('pagePath') // pagePath | pageTitle
  const [gaDemographics, setGaDemographics] = useState({
    countries: { allTime: [], last30Days: [], last7Days: [] },
    regions: { allTime: [], last30Days: [], last7Days: [] },
    cities: { allTime: [], last30Days: [], last7Days: [] },
  })
  const [gaDemographicsRange, setGaDemographicsRange] = useState('last30Days')
  const [gaViewsLoading, setGaViewsLoading] = useState(false)
  const [gaViewsError, setGaViewsError] = useState(null)

  // Templates/forms table (NOT from Google Analytics; from existing backend forms API)
  const [analyticsForms, setAnalyticsForms] = useState([])
  const [analyticsFormsLoading, setAnalyticsFormsLoading] = useState(false)
  const [analyticsFormsError, setAnalyticsFormsError] = useState(null)

  // Theme-aligned palette (brand + semantic accents via CSS vars)
  const COUNTRY_COLORS = [
    'var(--studio-primary)',
    'var(--studio-gradient)',
    'var(--side-gradient-end)',
    'var(--side-gradient-start)',
    'hsl(var(--destructive))',
    'hsl(var(--foreground) / 0.85)',
    'hsl(var(--foreground) / 0.65)',
    'hsl(var(--foreground) / 0.45)',
  ]

  const formatDuration = (seconds) => {
    const s = Number(seconds)
    if (!Number.isFinite(s) || s <= 0) return '0s'
    const total = Math.round(s)
    const m = Math.floor(total / 60)
    const r = total % 60
    return m > 0 ? `${m}m ${r}s` : `${r}s`
  }

  const makePieSegments = (items) => {
    const total = items.reduce((sum, it) => sum + (Number(it?.value) || 0), 0)
    if (!total) return { total: 0, segments: [] }
    let start = 0
    const segments = items.map((it, idx) => {
      const v = Number(it?.value) || 0
      const frac = v / total
      const seg = { ...it, startFrac: start, endFrac: start + frac, color: COUNTRY_COLORS[idx % COUNTRY_COLORS.length] }
      start += frac
      return seg
    })
    return { total, segments }
  }

  const segmentLabelPosition = (cx, cy, r, startFrac, endFrac) => {
    const mid = (startFrac + endFrac) / 2
    const angle = mid * Math.PI * 2 - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const describeArc = (cx, cy, r, startFrac, endFrac) => {
    const startAngle = startFrac * Math.PI * 2 - Math.PI / 2
    const endAngle = endFrac * Math.PI * 2 - Math.PI / 2
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const largeArc = endFrac - startFrac > 0.5 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  const fetchGaViews = useCallback(async () => {
    setGaViewsLoading(true)
    setGaViewsError(null)
    try {
      const res = await fetch(`/api/ga/forms-views?pagesDimension=${encodeURIComponent(gaPagesDimension)}`)
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.success) {
        setGaViewsError(body?.error || 'Failed to load Google Analytics views')
        return
      }
      setGaViews({
        allTime: Number(body.data?.views?.allTime) || 0,
        last30Days: Number(body.data?.views?.last30Days) || 0,
        last7Days: Number(body.data?.views?.last7Days) || 0,
      })
      setGaActiveUsers({
        allTime: Number(body.data?.activeUsers?.allTime) || 0,
        last30Days: Number(body.data?.activeUsers?.last30Days) || 0,
        last7Days: Number(body.data?.activeUsers?.last7Days) || 0,
      })
      setGaPages({
        allTime: Array.isArray(body.data?.pages?.allTime) ? body.data.pages.allTime : [],
        last30Days: Array.isArray(body.data?.pages?.last30Days) ? body.data.pages.last30Days : [],
        last7Days: Array.isArray(body.data?.pages?.last7Days) ? body.data.pages.last7Days : [],
      })
      const demo = body.data?.demographics || {}
      setGaDemographics({
        countries: {
          allTime: Array.isArray(demo?.countries?.allTime) ? demo.countries.allTime : [],
          last30Days: Array.isArray(demo?.countries?.last30Days) ? demo.countries.last30Days : [],
          last7Days: Array.isArray(demo?.countries?.last7Days) ? demo.countries.last7Days : [],
        },
        regions: {
          allTime: Array.isArray(demo?.regions?.allTime) ? demo.regions.allTime : [],
          last30Days: Array.isArray(demo?.regions?.last30Days) ? demo.regions.last30Days : [],
          last7Days: Array.isArray(demo?.regions?.last7Days) ? demo.regions.last7Days : [],
        },
        cities: {
          allTime: Array.isArray(demo?.cities?.allTime) ? demo.cities.allTime : [],
          last30Days: Array.isArray(demo?.cities?.last30Days) ? demo.cities.last30Days : [],
          last7Days: Array.isArray(demo?.cities?.last7Days) ? demo.cities.last7Days : [],
        },
      })
    } catch (e) {
      setGaViewsError('Failed to load Google Analytics views')
    } finally {
      setGaViewsLoading(false)
    }
  }, [gaPagesDimension])

  const fetchAnalyticsForms = useCallback(async () => {
    setAnalyticsFormsLoading(true)
    setAnalyticsFormsError(null)
    try {
      // Use backend forms API for templates table:
      // http://localhost:8080/api/formBuilder?page=1&limit=9
      const params = new URLSearchParams({ page: '1', limit: '9' })
      const result = await api.get(`/api/formBuilder?${params.toString()}`)
      const list = Array.isArray(result.data) ? result.data : null
      if (result.success && list) {
        setAnalyticsForms(list)
      } else {
        setAnalyticsFormsError(result.error || 'Failed to load forms for analytics')
      }
    } catch {
      setAnalyticsFormsError('Failed to load forms for analytics')
    } finally {
      setAnalyticsFormsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchGaViews()
      fetchAnalyticsForms()
    }
  }, [activeTab, fetchGaViews, fetchAnalyticsForms])

  const extractViewTimestamps = (form) => {
    const candidates = [
      form?.views,
      form?.viewEvents,
      form?.analytics?.views,
      form?.analytics?.viewEvents,
    ]
    for (const c of candidates) {
      if (!c) continue
      if (Array.isArray(c)) return c
    }
    return []
  }

  const viewsSummary = (() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000

    let all = 0
    let lastWeek = 0
    let lastMonth = 0

    for (const f of forms) {
      const tsList = extractViewTimestamps(f)
      for (const t of tsList) {
        const ms = typeof t === 'number' ? t : Date.parse(String(t))
        if (!Number.isFinite(ms)) continue
        all += 1
        if (ms >= monthAgo) lastMonth += 1
        if (ms >= weekAgo) lastWeek += 1
      }
    }

    return { all, lastMonth, lastWeek }
  })()

  // Builder form metadata
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [editingFormId, setEditingFormId] = useState(null)
  const [savingForm, setSavingForm] = useState(false)
  // Delete
  const [deletingFormId, setDeletingFormId] = useState(null)
  // Preview modal
  const [previewForm, setPreviewForm] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  // Clone
  const [cloningFormId, setCloningFormId] = useState(null)

  // Backend-required hidden fields injected into exported HTML
  const organisationID = user?.organisationID || ''
  const formID = editingFormId || ''
  const REQUIRED_SYSTEM_FIELDS = [
    { id: 'sys-organisationID', type: 'hidden', name: 'organisationID', label: 'organisationID', hidden: true, locked: true, styles: {} },
    { id: 'sys-formID', type: 'hidden', name: 'formID', label: 'formID', hidden: true, locked: true, styles: {} },
    { id: 'sys-locationID', type: 'hidden', name: 'locationID', label: 'locationID', hidden: true, locked: true, styles: {} },
  ]
  const REQUIRED_LEAD_FIELDS = [
    { id: 'req-name', type: 'text', name: 'name', label: 'Name', placeholder: 'Enter your name', required: true, locked: true, styles: {} },
    { id: 'req-email', type: 'email', name: 'email', label: 'Email', placeholder: 'you@email.com', required: true, locked: true, styles: {} },
    { id: 'req-phoneNumber', type: 'phone', name: 'phoneNumber', label: 'Phone Number', placeholder: '(555) 123-4567', required: true, locked: true, styles: {} },
    { id: 'req-location', type: 'text', name: 'location', label: 'Location', placeholder: 'Enter location', required: true, locked: true, styles: {} },
  ]
  const REQUIRED_FIELD_NAMES = new Set([
    'organisationID',
    'formID',
    'locationID',
    'name',
    'email',
    'phoneNumber',
    'location',
  ])

  const [formFields, setFormFields] = useState([
    ...REQUIRED_SYSTEM_FIELDS,
    ...REQUIRED_LEAD_FIELDS,
  ])
  const [selectedField, setSelectedField] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exportedHTML, setExportedHTML] = useState('')
  const [submitButton, setSubmitButton] = useState({
    id: 'submit-button',
    type: 'submit',
    label: 'Submit Form',
    styles: {},
  })

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const saveForm = async () => {
    if (!formName.trim()) {
      toast.error({ title: 'Name required', message: 'Please enter a form name before saving.' })
      return
    }
    if (formFields.length === 0) {
      toast.error({ title: 'Empty form', message: 'Please add at least one field before saving.' })
      return
    }
    setSavingForm(true)
    try {
      const htmlCode = generateExportedHTML()
      const payload = { name: formName.trim(), description: formDescription.trim(), htmlCode }
      const result = editingFormId
        ? await api.put(`/api/formBuilder/${editingFormId}`, payload)
        : await api.post('/api/formBuilder', payload)
      if (result.success) {
        toast.success({ title: 'Saved', message: editingFormId ? 'Form updated successfully.' : 'Form created successfully.' })
        setEditingFormId(result.data?._id || editingFormId)
        fetchForms()
        setActiveTab('templates')
      } else {
        toast.error({ title: 'Save failed', message: result.error || 'Could not save form.' })
      }
    } catch (e) {
      toast.error({ title: 'Error', message: 'Could not save form.' })
    } finally {
      setSavingForm(false)
    }
  }

  const deleteForm = async (form) => {
    if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return
    setDeletingFormId(form._id)
    try {
      const result = await api.delete(`/api/formBuilder/${form._id}`)
      if (result.success) {
        toast.success({ title: 'Deleted', message: 'Form deleted successfully.' })
        setForms((prev) => prev.filter((f) => f._id !== form._id))
        setFormsTotalCount((c) => c - 1)
      } else {
        toast.error({ title: 'Delete failed', message: result.error || 'Could not delete form.' })
      }
    } catch (e) {
      toast.error({ title: 'Error', message: 'Could not delete form.' })
    } finally {
      setDeletingFormId(null)
    }
  }

  const openPreviewForm = async (form) => {
    setPreviewForm({ name: form.name, htmlCode: form.htmlCode || '' })
    if (!form.htmlCode) {
      setPreviewLoading(true)
      try {
        const result = await api.get(`/api/formBuilder/${form._id}`)
        if (result.success) setPreviewForm({ name: result.data.name, htmlCode: result.data.htmlCode || '' })
      } catch (e) {}
      finally { setPreviewLoading(false) }
    }
  }

  const cloneForm = async (form) => {
    if (cloningFormId) return
    setCloningFormId(form._id)
    try {
      const result = await api.get(`/api/formBuilder/${form._id}`)
      if (!result.success) { toast.error({ title: 'Error', message: 'Could not fetch form.' }); return }
      const src = result.data
      const cloneResult = await api.post('/api/formBuilder', {
        name: `${src.name} copy`,
        description: src.description,
        htmlCode: src.htmlCode,
        url: src.url,
        utms: src.utms,
      })
      if (cloneResult.success) {
        toast.success({ title: 'Cloned', message: `"${src.name} copy" created.` })
        fetchForms()
      } else {
        toast.error({ title: 'Clone failed', message: cloneResult.error || 'Could not clone form.' })
      }
    } catch (e) {
      toast.error({ title: 'Error', message: 'Could not clone form.' })
    } finally {
      setCloningFormId(null)
    }
  }

  const openBuilderForNew = () => {
    setFormName('')
    setFormDescription('')
    setEditingFormId(null)
    setFormFields([...REQUIRED_SYSTEM_FIELDS, ...REQUIRED_LEAD_FIELDS])
    setSelectedField(null)
    setActiveTab('builder')
  }

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

  const RESERVED_FIELD_NAMES = new Set(['organisationID', 'formID', 'name', 'email', 'phoneNumber', 'location', 'locationID'])
  const SYSTEM_HIDDEN_FIELD_NAMES = new Set(['organisationID', 'formID', 'locationID'])

  const getFieldNameForHtml = (field) => {
    if (field?.name) return field.name
    return (field?.label || field?.id || 'field').toLowerCase().replace(/\s+/g, '_')
  }

  const parseCssSize = (value) => {
    const v = String(value || '').trim()
    return v || undefined
  }

  const applyPaddingShorthand = (styles, padding) => {
    const p = String(padding || '').trim()
    if (!p) return
    const parts = p.split(/\s+/).filter(Boolean)
    if (parts.length === 1) {
      styles.paddingTop = parts[0]
      styles.paddingRight = parts[0]
      styles.paddingBottom = parts[0]
      styles.paddingLeft = parts[0]
    } else if (parts.length === 2) {
      styles.paddingTop = parts[0]
      styles.paddingRight = parts[1]
      styles.paddingBottom = parts[0]
      styles.paddingLeft = parts[1]
    } else if (parts.length === 3) {
      styles.paddingTop = parts[0]
      styles.paddingRight = parts[1]
      styles.paddingBottom = parts[2]
      styles.paddingLeft = parts[1]
    } else if (parts.length >= 4) {
      styles.paddingTop = parts[0]
      styles.paddingRight = parts[1]
      styles.paddingBottom = parts[2]
      styles.paddingLeft = parts[3]
    }
  }

  const fieldTypeFromInputType = (t) => {
    const type = String(t || '').toLowerCase()
    if (type === 'email') return 'email'
    if (type === 'tel') return 'phone'
    if (type === 'phone') return 'phone'
    if (type === 'date') return 'date'
    if (type === 'file') return 'file'
    if (type === 'checkbox') return 'checkbox'
    if (type === 'radio') return 'rating'
    return 'text'
  }

  const buildFieldFromControl = (control, idSeed) => {
    const tag = control.tagName.toLowerCase()
    const isTextarea = tag === 'textarea'
    const isSelect = tag === 'select'
    const isInput = tag === 'input'

    let type = 'text'
    if (isTextarea) type = 'textarea'
    else if (isSelect) type = 'select'
    else if (isInput) type = fieldTypeFromInputType(control.getAttribute('type') || 'text')

    // Prefer label in the same container
    const container = control.closest('div') || control.parentElement
    const labelEl = container?.querySelector?.('label')
    const labelText = (labelEl?.textContent || '').replace(/\*/g, '').trim()

    const nameAttr = (control.getAttribute('name') || '').trim()
    const placeholder = (control.getAttribute('placeholder') || '').trim()
    const required = control.hasAttribute('required')

    const styles = {}
    // Input styling from inline styles in exported HTML
    const cs = control.style
    if (cs?.backgroundColor) styles.backgroundColor = cs.backgroundColor
    if (cs?.borderWidth) styles.borderWidth = cs.borderWidth
    if (cs?.borderStyle) styles.borderStyle = cs.borderStyle
    if (cs?.borderColor) styles.borderColor = cs.borderColor
    if (cs?.borderRadius) styles.borderRadius = cs.borderRadius
    if (cs?.width) styles.width = cs.width
    if (cs?.margin) styles.marginTop = cs.margin // preserve shorthand at least
    if (cs?.padding) applyPaddingShorthand(styles, cs.padding)
    if (cs?.paddingTop) styles.paddingTop = cs.paddingTop
    if (cs?.paddingRight) styles.paddingRight = cs.paddingRight
    if (cs?.paddingBottom) styles.paddingBottom = cs.paddingBottom
    if (cs?.paddingLeft) styles.paddingLeft = cs.paddingLeft

    // Label typography
    const ls = labelEl?.style
    if (ls?.fontFamily) styles.fontFamily = ls.fontFamily
    if (ls?.fontSize) styles.fontSize = parseCssSize(ls.fontSize)
    if (ls?.fontWeight) styles.fontWeight = ls.fontWeight
    if (ls?.color) styles.color = ls.color
    if (ls?.letterSpacing) styles.letterSpacing = ls.letterSpacing
    if (ls?.textTransform) styles.textTransform = ls.textTransform
    if (ls?.textAlign) styles.textAlign = ls.textAlign

    const options = []
    if (type === 'select') {
      control.querySelectorAll('option').forEach((opt) => {
        const value = (opt.getAttribute('value') || opt.textContent || '').trim()
        const label = (opt.textContent || value).trim()
        if (!value) return
        options.push({ label, value })
      })
    }

    return {
      id: `import-${idSeed}-${Date.now()}`,
      type,
      label: labelText || (nameAttr ? nameAttr.replace(/[_-]+/g, ' ') : 'Field'),
      name: nameAttr ? nameAttr.replace(/\[\]$/, '') : undefined,
      placeholder,
      required,
      styles,
      options,
    }
  }

  const importFormIntoBuilder = async (form) => {
    try {
      setSavingForm(false)
      setSelectedField(null)

      let htmlCode = form?.htmlCode || ''
      if (!htmlCode && form?._id) {
        const result = await api.get(`/api/formBuilder/${form._id}`)
        if (result.success) htmlCode = result.data?.htmlCode || ''
      }

      // Set metadata first (so required hidden fields pick up formID)
      setEditingFormId(form?._id || null)
      setFormName(form?.name || '')
      setFormDescription(form?.description || '')

      const inferred = []
      const byName = new Map()

      if (htmlCode && typeof window !== 'undefined') {
        const doc = new DOMParser().parseFromString(htmlCode, 'text/html')
        const formEl = doc.querySelector('form')

        // Capture submit button label if present
        const submitEl = formEl?.querySelector('button[type="submit"], input[type="submit"]')
        const submitLabel = submitEl
          ? (submitEl.tagName.toLowerCase() === 'input' ? submitEl.getAttribute('value') : submitEl.textContent)
          : ''
        if (submitLabel && submitLabel.trim()) {
          setSubmitButton((prev) => ({ ...prev, label: submitLabel.trim() }))
        }

        const controls = formEl ? Array.from(formEl.querySelectorAll('input, textarea, select')) : []
        controls.forEach((control, idx) => {
          const tag = control.tagName.toLowerCase()
          const typeAttr = tag === 'input' ? (control.getAttribute('type') || '').toLowerCase() : ''
          const nameAttr = (control.getAttribute('name') || '').trim().replace(/\[\]$/, '')

          if (typeAttr === 'submit') return
          if (typeAttr === 'hidden') return
          if (SYSTEM_HIDDEN_FIELD_NAMES.has(nameAttr)) return

          // Group checkbox options with the same name into a single field
          if (tag === 'input' && typeAttr === 'checkbox' && nameAttr) {
            const existing = byName.get(nameAttr)
            if (existing) {
              const labelEl = control.closest('div')?.querySelector('label')
              const optLabel = (labelEl?.textContent || control.getAttribute('value') || `Option ${existing.options.length + 1}`).trim()
              const optValue = (control.getAttribute('value') || optLabel).trim()
              existing.options.push({ label: optLabel, value: optValue })
              return
            }
          }

          const field = buildFieldFromControl(control, idx)
          // De-dupe by name if possible
          if (field?.name) {
            if (byName.has(field.name)) return
            byName.set(field.name, field)
          }
          inferred.push(field)
        })
      }

      // Ensure required lead fields always exist, and avoid duplicates
      const inferredFiltered = inferred.filter((f) => !REQUIRED_FIELD_NAMES.has(String(f?.name || '').trim()))
      const nextFields = [...REQUIRED_SYSTEM_FIELDS, ...REQUIRED_LEAD_FIELDS, ...inferredFiltered]
      setFormFields(nextFields)
      const firstVisible = [...REQUIRED_LEAD_FIELDS, ...inferredFiltered].find((f) => f && !f.hidden && f.type !== 'hidden')
      setSelectedField(firstVisible?.id || null)
      setActiveTab('builder')
    } catch (e) {
      console.error(e)
      toast.error({ title: 'Import failed', message: 'Could not open this form in the builder.' })
    }
  }

  const addField = (type) => {
    const fieldType = fieldTypes.find(ft => ft.id === type)
    const newField = {
      id: Date.now().toString(),
      type,
      label: fieldType?.name || `New ${type} field`,
      placeholder: `Enter ${type}...`,
      required: false,
      styles: {},
      options: type === 'select' ? [{ label: 'Option 1', value: 'option_1' }] : type === 'checkbox' ? [{ label: 'Option 1', value: 'option_1' }] : [],
    }
    setFormFields([...formFields, newField])
    setSelectedField(newField.id)
  }

  const applyTemplate = (templateId) => {
    const fields = templateFields[templateId] || []
    const normalized = fields.map((field, index) => ({
      ...field,
      id: `${templateId}-${index}-${Date.now()}`,
      styles: {},
    }))
    // Prevent template fields from duplicating reserved backend field names (e.g. a second "email")
    const filtered = normalized.filter((f) => !REQUIRED_FIELD_NAMES.has(getFieldNameForHtml(f)))
    setFormFields([...REQUIRED_SYSTEM_FIELDS, ...REQUIRED_LEAD_FIELDS, ...filtered])
    setSelectedField(normalized[0]?.id || null)
    setActiveTab('builder')
  }

  const removeField = (id) => {
    const field = formFields.find((f) => f.id === id)
    if (field?.locked) return
    setFormFields(formFields.filter((f) => f.id !== id))
    if (selectedField === id) setSelectedField(null)
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

    // Handle dropping field types from left panel to canvas
    if (active.id.toString().startsWith('field-type-')) {
      const fieldTypeId = active.id.toString().replace('field-type-', '')
      const fieldType = fieldTypes.find((ft) => ft.id === fieldTypeId)
      
      if (fieldType) {
        addField(fieldType.id)
      }
      setActiveId(null)
      return
    }

    // Handle reordering existing fields
    if (active.id !== over.id) {
      const activeIndex = formFields.findIndex((item) => item.id === active.id)
      const overIndex = formFields.findIndex((item) => item.id === over.id)
      
      if (activeIndex !== -1 && overIndex !== -1) {
        setFormFields((items) => arrayMove(items, activeIndex, overIndex))
      }
    }

    setActiveId(null)
  }

  const handleFieldUpdate = (updatedField) => {
    if (updatedField.id === 'submit-button' || updatedField.type === 'submit') {
      setSubmitButton(updatedField)
    } else {
      setFormFields(
        formFields.map((f) => (f.id === updatedField.id ? updatedField : f))
      )
    }
  }

  const generateFieldHTML = (field) => {
    if (field.type === 'hidden' || field.hidden) {
      if (field.name === 'organisationID') {
        return `<input type="hidden" name="organisationID" value="${organisationID}" />`
      }
      if (field.name === 'formID') {
        return `<input type="hidden" name="formID" value="${formID}" />`
      }
      if (field.name === 'locationID') {
        return `<input type="hidden" name="locationID" value="" />`
      }
      return `<input type="hidden" name="${field.name || field.id}" value="" />`
    }

    const fieldStyles = field.styles || {}
    const styleString = `
      background-color: ${fieldStyles.backgroundColor || '#ffffff'};
      padding: ${fieldStyles.paddingTop || '0.5rem'} ${fieldStyles.paddingRight || '0.75rem'} ${fieldStyles.paddingBottom || '0.5rem'} ${fieldStyles.paddingLeft || '0.75rem'};
      border-width: ${fieldStyles.borderWidth || '1px'};
      border-style: ${fieldStyles.borderStyle || 'solid'};
      border-color: ${fieldStyles.borderColor || '#e2e8f0'};
      border-radius: ${fieldStyles.borderRadius || '0.375rem'};
      width: ${fieldStyles.width || '100%'};
      margin: ${fieldStyles.marginTop || '0'} ${fieldStyles.marginRight || '0'} ${fieldStyles.marginBottom || '0'} ${fieldStyles.marginLeft || '0'};
      box-sizing: border-box;
    `.trim().replace(/\s+/g, ' ')

    const labelStyleParts = []
    if (fieldStyles.fontFamily) {
      labelStyleParts.push(`font-family: ${fieldStyles.fontFamily}`)
    }
    if (fieldStyles.fontSize) {
      labelStyleParts.push(`font-size: ${fieldStyles.fontSize}`)
    } else {
      labelStyleParts.push(`font-size: 0.875rem`)
    }
    labelStyleParts.push(`font-weight: ${fieldStyles.fontWeight || '500'}`)
    labelStyleParts.push(`color: ${fieldStyles.color || '#334155'}`)
    if (fieldStyles.letterSpacing) {
      labelStyleParts.push(`letter-spacing: ${fieldStyles.letterSpacing}`)
    }
    if (fieldStyles.textAlign) {
      labelStyleParts.push(`text-align: ${fieldStyles.textAlign}`)
    }
    if (fieldStyles.textTransform) {
      labelStyleParts.push(`text-transform: ${fieldStyles.textTransform}`)
    }
    const labelStyleString = labelStyleParts.join('; ')

    let fieldHTML = ''
    const fieldName = getFieldNameForHtml(field)
    
    if (field.type === 'textarea') {
      fieldHTML = `<textarea 
        name="${fieldName}" 
        placeholder="${field.placeholder || ''}" 
        ${field.required ? 'required' : ''}
        style="${styleString}"
        rows="3"
      ></textarea>`
    } else if (field.type === 'select') {
      const optsHtml = (field.options || []).map(opt => {
        const v = (opt.value || opt.label || '').toString().replace(/"/g, '&quot;')
        const l = (opt.label || opt.value || '').toString().replace(/"/g, '&quot;')
        return `<option value="${v}">${l}</option>`
      }).join('')
      fieldHTML = `<select 
        name="${fieldName}" 
        ${field.required ? 'required' : ''}
        style="${styleString}"
      >
        <option value="">Select an option</option>
        ${optsHtml}
      </select>`
    } else if (field.type === 'checkbox') {
      const optsHtml = (field.options || []).map((opt, idx) => {
        const v = (opt.value || opt.label || `option_${idx+1}`).toString().replace(/"/g, '&quot;')
        const l = (opt.label || opt.value || `Option ${idx+1}`).toString().replace(/"/g, '&quot;')
        const id = `${field.id}_${v}`
        return `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
          <input type="checkbox" name="${fieldName}[]" id="${id}" value="${v}" ${field.required ? 'required' : ''} style="width: auto;" />
          <label for="${id}" style="font-size:0.875rem; color:#475569;">${l}</label>
        </div>`
      }).join('')
      fieldHTML = optsHtml || `<div style="display:flex; align-items:center; gap:0.5rem;">
        <input type="checkbox" name="${fieldName}" id="${field.id}" ${field.required ? 'required' : ''} style="width: auto;" />
        <label for="${field.id}" style="font-size:0.875rem; color:#475569;">${field.placeholder || 'Checkbox option'}</label>
      </div>`
    } else if (field.type === 'rating') {
      fieldHTML = `<div style="display: flex; gap: 0.25rem; align-items: center;">
        ${[1, 2, 3, 4, 5].map(star => `
          <input 
            type="radio" 
            name="${fieldName}" 
            value="${star}" 
            id="${field.id}_${star}"
            ${field.required ? 'required' : ''}
            style="display: none;"
          />
          <label 
            for="${field.id}_${star}" 
            style="font-size: 1.5rem; cursor: pointer; color: #cbd5e1;"
            onmouseover="this.style.color='#fbbf24'"
            onmouseout="this.style.color='#cbd5e1'"
          >★</label>
        `).join('')}
      </div>`
    } else {
      fieldHTML = `<input 
        type="${field.type}" 
        name="${fieldName}" 
        placeholder="${field.placeholder || ''}" 
        ${field.required ? 'required' : ''}
        style="${styleString}"
      />`
    }

    return `
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; ${labelStyleString};">
          ${field.label}
          ${field.required ? '<span style="color: #ef4444; margin-left: 0.25rem;">*</span>' : ''}
        </label>
        ${fieldHTML}
      </div>
    `
  }

  const generateExportedHTML = () => {
    if (formFields.length === 0) {
      return ''
    }

    // De-dupe by HTML field name to avoid FormData arrays + duplicated UI fields
    const seenNames = new Set()
    const fieldsHTML = formFields
      .filter((field) => {
        const key = getFieldNameForHtml(field)
        if (!key) return true
        if (seenNames.has(key)) return false
        seenNames.add(key)
        return true
      })
      .map((field) => generateFieldHTML(field))
      .join('\n')
    // Analytics snippet injected into exported HTML <head>
    const gtagScript = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-4PKNTJ6CWT"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-4PKNTJ6CWT');
  </script>
`

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Form</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .form-container {
      background: white;
      padding: 2rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 600px;
    }
    .form-container h2 {
      margin-bottom: 1.5rem;
      color: #1e293b;
      font-size: 1.5rem;
      font-weight: 600;
    }
    .form-container form {
      display: flex;
      flex-direction: column;
    }
    .form-container input[type="text"],
    .form-container input[type="email"],
    .form-container input[type="tel"],
    .form-container input[type="date"],
    .form-container input[type="file"],
    .form-container textarea,
    .form-container select {
      width: 100%;
      outline: none;
      transition: all 0.2s;
    }
    .form-container input[type="text"]:focus,
    .form-container input[type="email"]:focus,
    .form-container input[type="tel"]:focus,
    .form-container input[type="date"]:focus,
    .form-container textarea:focus,
    .form-container select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .submit-btn {
      background: ${submitButton.styles?.backgroundColor || '#2563eb'};
      color: ${submitButton.styles?.color || 'white'};
      ${submitButton.styles?.borderWidth ? `border: ${submitButton.styles.borderWidth} ${submitButton.styles.borderStyle || 'solid'} ${submitButton.styles.borderColor || '#e2e8f0'};` : 'border: none;'}
      padding: ${submitButton.styles?.paddingTop || '0.75rem'} ${submitButton.styles?.paddingRight || '1.5rem'} ${submitButton.styles?.paddingBottom || '0.75rem'} ${submitButton.styles?.paddingLeft || '1.5rem'};
      border-radius: ${submitButton.styles?.borderRadius || '0.375rem'};
      font-size: ${submitButton.styles?.fontSize || '1rem'};
      font-weight: ${submitButton.styles?.fontWeight || '500'};
      font-family: ${submitButton.styles?.fontFamily || 'inherit'};
      ${submitButton.styles?.letterSpacing ? `letter-spacing: ${submitButton.styles.letterSpacing};` : ''}
      ${submitButton.styles?.textAlign ? `text-align: ${submitButton.styles.textAlign};` : ''}
      ${submitButton.styles?.textTransform ? `text-transform: ${submitButton.styles.textTransform};` : ''}
      cursor: pointer;
      margin-top: ${submitButton.styles?.marginTop || '1.5rem'};
      margin-right: ${submitButton.styles?.marginRight || '0'};
      margin-bottom: ${submitButton.styles?.marginBottom || '0'};
      margin-left: ${submitButton.styles?.marginLeft || '0'};
      width: ${submitButton.styles?.width || '100%'};
      transition: opacity 0.2s;
      box-sizing: border-box;
    }
    .submit-btn:hover {
      opacity: 0.9;
    }
    .submit-btn:active {
      opacity: 0.8;
    }
  </style>
${gtagScript}
</head>
<body>
  <div class="form-container">
    <form id="exportedForm" action="#" method="POST">
      ${fieldsHTML}
      <button type="submit" class="submit-btn">${submitButton.label}</button>
    </form>
  </div>
  <script>
    (function() {
      const form = document.getElementById('exportedForm');
      if (form) {
        form.addEventListener('submit', async function(event) {
          event.preventDefault();

          // Capture page URL (prefer top-level URL; fallback to referrer / iframe URL)
          let capturedUrl = '';
          try {
            capturedUrl = (window.top && window.top.location && window.top.location.href) ? window.top.location.href : '';
          } catch (e) {
            capturedUrl = '';
          }
          if (!capturedUrl) capturedUrl = document.referrer || '';
          if (!capturedUrl) capturedUrl = window.location.href || '';

          const urlInput = form.querySelector('input[name="url"]');
          if (urlInput) urlInput.value = capturedUrl;

          const formData = new FormData(form);
          const payload = {};

          formData.forEach((value, key) => {
            const normalizedKey = key.endsWith('[]') ? key.slice(0, -2) : key;
            if (payload[normalizedKey] === undefined) payload[normalizedKey] = value;
            else if (Array.isArray(payload[normalizedKey])) payload[normalizedKey].push(value);
            else payload[normalizedKey] = [payload[normalizedKey], value];
          });

          const pickFirst = (v) => Array.isArray(v) ? v[0] : v;
          payload.name = payload.name || pickFirst(payload.full_name) || pickFirst(payload.student_name) || pickFirst(payload.parent_name);
          payload.email = payload.email || pickFirst(payload.email_address) || pickFirst(payload.parent_email);
          payload.phone = payload.phone || pickFirst(payload.phone_number) || pickFirst(payload.phone);
          payload.source = payload.source || 'Website';
          payload.url = capturedUrl;
          // Safety: ensure backend required ids are scalar even if duplicated somehow
          payload.organisationID = pickFirst(payload.organisationID);
          payload.formID = pickFirst(payload.formID);

          try {
            const res = await fetch('https://98.88.253.231.sslip.io/api/lead/form', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => null);
            if (res.ok) {
              alert('Form submitted successfully!');
            } else {
              alert(body?.message || 'Form submission failed');
            }
          } catch (err) {
            alert('Network error while submitting form');
          }
        });
      }

      // Rating star interaction
      document.querySelectorAll('input[type="radio"][name*="rating"]').forEach(radio => {
        radio.addEventListener('change', function() {
          const name = this.name;
          const value = parseInt(this.value);
          document.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach((r, index) => {
            const label = document.querySelector('label[for="' + r.id + '"]');
            if (index < value) {
              label.style.color = '#fbbf24';
            } else {
              label.style.color = '#cbd5e1';
            }
          });
        });
      });
    })();
  </script>
</body>
</html>`
  }

  const exportAsHTML = () => {
    if (formFields.length === 0) {
      alert('Please add at least one field to export the form.')
      return
    }

    const htmlContent = generateExportedHTML()
    setExportedHTML(htmlContent)
    setShowExport(true)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportedHTML).then(() => {
      alert('HTML code copied to clipboard!')
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = exportedHTML
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('HTML code copied to clipboard!')
    })
  }

  const downloadHTML = () => {
    const blob = new Blob([exportedHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'form.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handlePreview = () => {
    setShowPreview(true)
  }

  const renderPreviewField = (field) => {
    const fieldStyles = field.styles || {}
    const inputStyle = {
      backgroundColor: fieldStyles.backgroundColor || '#ffffff',
      padding: `${fieldStyles.paddingTop || '0.5rem'} ${fieldStyles.paddingRight || '0.75rem'} ${fieldStyles.paddingBottom || '0.5rem'} ${fieldStyles.paddingLeft || '0.75rem'}`,
      borderWidth: fieldStyles.borderWidth || '1px',
      borderStyle: fieldStyles.borderStyle || 'solid',
      borderColor: fieldStyles.borderColor || '#e2e8f0',
      borderRadius: fieldStyles.borderRadius || '0.375rem',
      width: fieldStyles.width || '100%',
      margin: `${fieldStyles.marginTop || '0'} ${fieldStyles.marginRight || '0'} ${fieldStyles.marginBottom || '0'} ${fieldStyles.marginLeft || '0'}`,
      boxSizing: 'border-box',
    }

    const labelStyle = {
      fontWeight: fieldStyles.fontWeight || '500',
      color: fieldStyles.color || '#334155',
    }
    if (fieldStyles.fontSize) {
      labelStyle.fontSize = fieldStyles.fontSize
    } else {
      labelStyle.fontSize = '0.875rem'
    }
    if (fieldStyles.fontFamily) {
      labelStyle.fontFamily = fieldStyles.fontFamily
    }
    if (fieldStyles.letterSpacing) {
      labelStyle.letterSpacing = fieldStyles.letterSpacing
    }
    if (fieldStyles.textAlign) {
      labelStyle.textAlign = fieldStyles.textAlign
    }
    if (fieldStyles.textTransform) {
      labelStyle.textTransform = fieldStyles.textTransform
    }

    return (
      <div key={field.id} style={{ marginBottom: '1rem' }}>
        <Label className="block mb-2" style={labelStyle}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.type === 'textarea' ? (
          <textarea
            placeholder={field.placeholder}
            style={inputStyle}
            rows={3}
            className="w-full resize-none focus:outline-none focus:ring-2 focus:ring-brand"
          />
        ) : field.type === 'select' ? (
          <select
            style={inputStyle}
            className="w-full focus:outline-none focus:ring-2 focus:ring-brand"
            defaultValue=""
          >
            <option value="">Select an option</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value || opt.label} value={opt.value || opt.label}>
                {opt.label || opt.value}
              </option>
            ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <div className="flex flex-col gap-2">
            {(field.options && field.options.length > 0) ? (
              field.options.map((opt, idx) => (
                <div key={opt.value || opt.label || idx} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 text-brand" />
                  <span className="text-sm text-slate-600">{opt.label || opt.value}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 text-brand" />
                <span className="text-sm text-slate-600">{field.placeholder || 'Checkbox option'}</span>
              </div>
            )}
          </div>
        ) : field.type === 'rating' ? (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className="text-2xl text-yellow-400 cursor-pointer">★</span>
            ))}
          </div>
        ) : (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            style={inputStyle}
            className="focus:outline-none focus:ring-2 focus:ring-brand"
          />
        )}
      </div>
    )
  }

  const selectedFieldData = selectedField === 'submit-button' 
    ? submitButton 
    : formFields.find((f) => f.id === selectedField)

  return (
    <MainLayout title="Form Builder" subtitle="Create and manage forms">
      <div className="space-y-6 min-h-full flex flex-col">
        {/* Templates View */}
        {activeTab === 'templates' && (
          <div className="space-y-6 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-slate-600">Browse and manage your forms</p>
              <Button variant="gradient" onClick={openBuilderForNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Form
              </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search forms…"
                value={formsSearch}
                onChange={(e) => setFormsSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {formsLoading && (
              <div className="flex items-center justify-center py-16">
                <GlobalLoader variant="inline" size="md" />
              </div>
            )}

            {formsError && !formsLoading && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="py-8 text-center">
                  <p className="text-sm font-medium text-destructive">{formsError}</p>
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={fetchForms}>Retry</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!formsLoading && !formsError && forms.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-muted-foreground">No forms yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first form to get started.</p>
                </CardContent>
              </Card>
            )}

            {!formsLoading && !formsError && forms.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {forms.map((form) => {
                    const isInactive = form.status === 'inactive'
                    return (
                      <Card
                        key={form._id}
                        className={`relative hover:shadow-lg transition-all duration-200${isInactive ? ' opacity-60' : ''}`}
                      >
                        {/* Top-right toggles */}
                        <div className="absolute top-3 right-3 flex items-center gap-1">
                          <Switch
                            checked={!isInactive}
                            onChange={() => toggleFormStatus(form)}
                            disabled={togglingIds.has(form._id)}
                            title={isInactive ? 'Set active' : 'Set inactive'}
                            className="disabled:opacity-40 scale-75"
                          />
                          <button
                            type="button"
                            onClick={() => toggleFormFavorite(form)}
                            disabled={togglingIds.has(form._id)}
                            title={form.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            className={`h-7 w-7 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-40 ${
                              form.isFavorite ? 'text-red-500 hover:bg-red-50' : 'text-muted-foreground hover:bg-muted hover:text-red-400'
                            }`}
                          >
                            <Heart className={`h-4 w-4 transition-all duration-200${form.isFavorite ? ' fill-current' : ''}${heartAnimIds.has(form._id) ? ' scale-125' : ''}`} />
                          </button>
                        </div>

                        <CardHeader className="pr-20">
                          <div className="flex items-start mb-2 gap-3">
                            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <FileText className="h-6 w-6 text-slate-600" />
                            </div>
                          </div>
                          <CardTitle className="text-lg line-clamp-1">{form.name}</CardTitle>
                          {form.description && <p className="text-sm text-slate-500 line-clamp-2">{form.description}</p>}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 mb-4">
                            {form.url && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500">URL</span>
                                <span className="font-medium text-slate-900 truncate max-w-[160px]">{form.url}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Created</span>
                              <span className="font-medium text-slate-900">{formatDate(form.createdAt)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="gradient"
                              size="sm"
                              className="flex-1"
                              disabled={isInactive}
                              onClick={() => importFormIntoBuilder(form)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              disabled={isInactive || cloningFormId === form._id}
                              onClick={() => cloneForm(form)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              {cloningFormId === form._id ? 'Cloning…' : 'Clone'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteForm(form)}
                              disabled={deletingFormId === form._id}
                              title="Delete"
                            >
                              {deletingFormId === form._id
                                ? <GlobalLoader variant="inline" size="xs" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Pagination */}
                {formsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => setFormsPage((p) => Math.max(1, p - 1))}
                      disabled={formsPage === 1 || formsLoading}
                      className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {formsPage} of {formsTotalPages} ({formsTotalCount} total)
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormsPage((p) => Math.min(formsTotalPages, p + 1))}
                      disabled={formsPage === formsTotalPages || formsLoading}
                      className="h-8 px-3 rounded-lg border border-border bg-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Builder View */}
        {activeTab === 'builder' && (
          <div className="h-[calc(100vh-200px)] flex flex-col gap-3">
          {/* Form name + description row */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Input
              placeholder="Form name (required)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="max-w-xs font-medium"
            />
            <Input
              placeholder="Description (optional)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="max-w-sm"
            />
            {editingFormId && (
              <span className="text-xs text-muted-foreground italic">Editing existing form</span>
            )}
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
              {/* Field Types Panel */}
              <div className="col-span-3 flex flex-col min-h-0 self-stretch">
                <Card className="flex flex-col flex-1 min-h-0" style={{ height: 'calc(100% + 30px)' }}>
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="text-base">Components</CardTitle>
                    <p className="text-sm text-slate-500">Drag to add or click to insert</p>
                  </CardHeader>
                  <CardContent 
                    className="space-y-1 overflow-y-auto flex-1 pb-2 min-h-0"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {fieldTypes.map((fieldType) => (
                      <DraggableFieldType
                        key={fieldType.id}
                        fieldType={fieldType}
                        onClick={(fieldType) => addField(fieldType.id)}
                      />

                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Form Canvas */}
              <div className="col-span-6 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Form Preview</CardTitle>
                      <div className="flex items-center gap-2">
                       
                        <Button variant="gradient" size="sm" onClick={saveForm} disabled={savingForm}>
                          {savingForm ? 'Saving…' : (editingFormId ? 'Update Form' : 'Save Form')}
                        </Button>
                      </div>

                    </div>
                  </CardHeader>
                  <CardContent 
                    className="overflow-y-auto flex-1 pb-2 min-h-0"
                    style={{ overscrollBehavior: 'contain', padding: '8px' }}
                  >
                    <DroppableCanvas isEmpty={formFields.length === 0}>
                      {formFields.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                          <p className="text-slate-500 text-sm">
                            Drag components here or click to add
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 pl-10 pr-2">
                          <SortableContext items={formFields.filter((f) => !f.hidden && f.type !== 'hidden').map((f) => f.id)} strategy={verticalListSortingStrategy}>
                            {formFields.filter((f) => !f.hidden && f.type !== 'hidden').map((field) => (
                              <SortableFieldItem
                                key={field.id}
                                field={field}
                                isSelected={selectedField === field.id}
                                onSelect={setSelectedField}
                                onRemove={removeField}
                              />
                            ))}
                          </SortableContext>
                          
                          <div className="pt-6 border-t">
                            <div
                              onClick={() => setSelectedField('submit-button')}
                              className={`relative group cursor-pointer rounded-lg transition-all ${
                                selectedField === 'submit-button'
                                  ? 'ring-2 ring-brand ring-offset-2'
                                  : ''
                              }`}
                            >
                              <Button 
                                variant="gradient" 
                                className="w-full"
                                style={{
                                  fontFamily: submitButton.styles?.fontFamily,
                                  fontSize: submitButton.styles?.fontSize,
                                  fontWeight: submitButton.styles?.fontWeight,
                                  color: submitButton.styles?.color,
                                  backgroundColor: submitButton.styles?.backgroundColor,
                                  padding: submitButton.styles?.paddingTop ? `${submitButton.styles.paddingTop} ${submitButton.styles.paddingRight || submitButton.styles.paddingTop} ${submitButton.styles.paddingBottom || submitButton.styles.paddingTop} ${submitButton.styles.paddingLeft || submitButton.styles.paddingTop}` : undefined,
                                  ...(submitButton.styles?.borderWidth ? { 
                                    borderWidth: submitButton.styles.borderWidth,
                                    borderStyle: submitButton.styles.borderStyle || 'solid',
                                    borderColor: submitButton.styles.borderColor || '#e2e8f0'
                                  } : { border: 'none' }),
                                  borderRadius: submitButton.styles?.borderRadius,
                                  width: submitButton.styles?.width || '100%',
                                  margin: submitButton.styles?.marginTop ? `${submitButton.styles.marginTop} ${submitButton.styles.marginRight || '0'} ${submitButton.styles.marginBottom || '0'} ${submitButton.styles.marginLeft || '0'}` : undefined,
                                  /* typography support */
                                  letterSpacing: submitButton.styles?.letterSpacing,
                                  textTransform: submitButton.styles?.textTransform,
                                  textAlign: submitButton.styles?.textAlign,
                                  /* ensure alignment inside the UI Button (which uses flex) */
                                  display: submitButton.styles?.textAlign ? 'flex' : undefined,
                                  justifyContent: submitButton.styles?.textAlign
                                    ? submitButton.styles.textAlign === 'left'
                                      ? 'flex-start'
                                      : submitButton.styles.textAlign === 'center'
                                      ? 'center'
                                      : submitButton.styles.textAlign === 'right'
                                      ? 'flex-end'
                                      : submitButton.styles.textAlign === 'justify'
                                      ? 'space-between'
                                      : undefined
                                    : undefined,
                                }}
                              >
                                {submitButton.label}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </DroppableCanvas>
                  </CardContent>
                </Card>
              </div>

              {/* Field Settings Panel */}
              <div className="col-span-3 flex flex-col min-h-0">
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <CardTitle className="text-base">
                      {selectedFieldData ? 'Field Settings' : 'Properties'}
                    </CardTitle>
                    {selectedFieldData && (
                      <p className="text-sm text-slate-500 capitalize">{selectedFieldData.type} field</p>
                    )}
                  </CardHeader>
                  <CardContent 
                    className="overflow-y-auto flex-1 pb-2 min-h-0"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {selectedFieldData ? (
                      <StylePanel
                        field={selectedFieldData}
                        onStyleChange={handleFieldUpdate}
                        onFieldUpdate={handleFieldUpdate}
                      />
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <div className="mb-3 text-4xl">⚙️</div>
                        <p className="text-sm">Select a field to edit</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="mt-4 space-y-2 flex-shrink-0">
                  <Button variant="gradient" className="w-full" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Form
                  </Button>
                  <Button variant="outline" className="w-full" onClick={exportAsHTML}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as HTML
                  </Button>
                </div>

              </div>
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="p-4 rounded-lg border-2 border-brand bg-white shadow-xl">
                  {activeId.toString().startsWith('field-type-') ? (
                    (() => {
                      const fieldType = fieldTypes.find((ft) => `field-type-${ft.id}` === activeId.toString())
                      const IconComponent = fieldType?.icon
                      return (
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                          {IconComponent && <IconComponent className="h-5 w-5 text-slate-600" />}
                          <span>{fieldType?.name}</span>
                        </div>
                      )
                    })()
                  ) : (
                    <div className="text-sm font-medium text-slate-700">
                      {formFields.find(f => f.id === activeId)?.label || 'Moving field...'}
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
          <div className="space-y-6 relative">
          {gaViewsLoading ? (
            <div className="absolute inset-0 z-10 rounded-lg bg-background/70 backdrop-blur-[1px] flex items-center justify-center">
              <GlobalLoader text="Fetching analytics…" />
            </div>
          ) : null}
          {!gaViewsLoading && analyticsFormsLoading ? (
            <div className="absolute inset-0 z-10 rounded-lg bg-background/70 backdrop-blur-[1px] flex items-center justify-center">
              <GlobalLoader text="Loading templates…" />
            </div>
          ) : null}
          {(() => {
            // Dummy submissions + conversion rate (until real submission tracking exists)
            const baseViews = Number(gaViews?.last30Days) || 0
            const submissionRate = 0.12 // 12% dummy baseline
            const totalSubmissions = Math.max(0, Math.round(baseViews * submissionRate))
            const conversionRate = baseViews > 0 ? (totalSubmissions / baseViews) * 100 : 0
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total form submissions</p>
                        <h3 className="text-3xl font-bold text-foreground tabular-nums">
                          {gaViewsLoading ? '—' : totalSubmissions}
                        </h3>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-brand-light flex items-center justify-center">
                        <FileText className="h-6 w-6 text-brand" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Conversion rate</p>
                        <h3 className="text-3xl font-bold text-foreground tabular-nums">
                          {gaViewsLoading ? '—' : `${conversionRate.toFixed(1)}%`}
                        </h3>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Views (all-time)</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {gaViewsLoading ? '—' : gaViews.allTime}
                    </h3>
                    {gaViewsError ? (
                      <p className="text-xs text-destructive mt-2">{gaViewsError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">From Google Analytics</p>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-brand-light flex items-center justify-center">
                    <FileText className="h-6 w-6 text-brand" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Views (last 30 days)</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {gaViewsLoading ? '—' : gaViews.last30Days}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Views (last 7 days)</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {gaViewsLoading ? '—' : gaViews.last7Days}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Users (all-time)</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {gaViewsLoading ? '—' : gaActiveUsers.allTime}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Users (last 30 days)</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {gaViewsLoading ? '—' : gaActiveUsers.last30Days}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active Users (last 7 days)</p>
                    <h3 className="text-3xl font-bold text-foreground">
                      {gaViewsLoading ? '—' : gaActiveUsers.last7Days}
                    </h3>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Demographics</CardTitle>
                  <CardDescription>Active users distribution</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={gaDemographicsRange === 'allTime' ? 'default' : 'outline'}
                    onClick={() => setGaDemographicsRange('allTime')}
                    disabled={gaViewsLoading}
                  >
                    All time
                  </Button>
                  <Button
                    size="sm"
                    variant={gaDemographicsRange === 'last30Days' ? 'default' : 'outline'}
                    onClick={() => setGaDemographicsRange('last30Days')}
                    disabled={gaViewsLoading}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    size="sm"
                    variant={gaDemographicsRange === 'last7Days' ? 'default' : 'outline'}
                    onClick={() => setGaDemographicsRange('last7Days')}
                    disabled={gaViewsLoading}
                  >
                    Last 7 days
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {(() => {
                const mkItems = (raw, key) => {
                  const rows = Array.isArray(raw) ? raw : []
                  const filtered = rows.filter((x) => x && (Number(x.activeUsers) || 0) > 0)
                  const top = filtered
                    .slice(0, 5)
                    .map((x) => ({ label: x?.[key] || '(not set)', value: Number(x.activeUsers) || 0 }))
                  const otherValue = filtered.slice(5).reduce((sum, x) => sum + (Number(x?.activeUsers) || 0), 0)
                  return otherValue > 0 ? [...top, { label: 'Other', value: otherValue }] : top
                }

                const countryItems = mkItems(gaDemographics?.countries?.[gaDemographicsRange], 'country')
                const regionItems = mkItems(gaDemographics?.regions?.[gaDemographicsRange], 'region')
                const cityItems = mkItems(gaDemographics?.cities?.[gaDemographicsRange], 'city')

                const charts = [
                  { title: 'Country', items: countryItems, aria: 'Active users by country' },
                  { title: 'Region', items: regionItems, aria: 'Active users by region' },
                  { title: 'Town/City', items: cityItems, aria: 'Active users by city' },
                ]

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {charts.map((c, cIdx) => {
                      const { total, segments } = makePieSegments(c.items)
                      if (!segments.length) {
                        return (
                          <div key={c.title} className="rounded-lg border border-border bg-card p-4">
                            <div className="text-sm font-semibold text-foreground">{c.title}</div>
                            <div className="text-sm text-muted-foreground py-8">No data yet.</div>
                          </div>
                        )
                      }

                      return (
                        <div key={c.title} className="rounded-lg border border-border bg-card p-4">
                          <div className="text-sm font-semibold text-foreground mb-3">{c.title}</div>
                          <div className="flex items-start gap-4">
                            <svg width="200" height="200" viewBox="0 0 220 220" role="img" aria-label={c.aria}>
                              <defs>
                                <filter id={`pieShadow-${cIdx}`} x="-20%" y="-20%" width="140%" height="140%">
                                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(15, 23, 42, 0.12)" />
                                </filter>
                              </defs>
                              <circle cx="110" cy="110" r="92" fill="hsl(var(--muted))" />
                              {segments.length === 1 ? (
                                <circle
                                  cx="110"
                                  cy="110"
                                  r="90"
                                  fill={segments[0].color}
                                  filter={`url(#pieShadow-${cIdx})`}
                                  stroke="hsl(var(--card))"
                                  strokeWidth="2"
                                />
                              ) : (
                                segments.map((s, idx) => (
                                  <path
                                    key={idx}
                                    d={describeArc(110, 110, 90, s.startFrac, s.endFrac)}
                                    fill={s.color}
                                    filter={`url(#pieShadow-${cIdx})`}
                                    stroke="hsl(var(--card))"
                                    strokeWidth="2"
                                  />
                                ))
                              )}
                              {segments.map((s, idx) => {
                                const pct = total ? (s.value / total) * 100 : 0
                                if (pct < 4) return null
                                const { x, y } = segmentLabelPosition(110, 110, 62, s.startFrac, s.endFrac)
                                return (
                                  <text
                                    key={`t-${idx}`}
                                    x={x}
                                    y={y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={segments.length === 1 ? 'hsl(var(--primary-foreground))' : 'white'}
                                    fontSize="14"
                                    fontWeight="700"
                                  >
                                    {Math.round(pct)}%
                                  </text>
                                )
                              })}
                            </svg>

                            <div className="flex-1 space-y-2 pt-1">
                              {segments.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="truncate text-muted-foreground">{s.label}</span>
                                  </div>
                                  <div className="shrink-0 tabular-nums text-foreground font-medium">{s.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Pages and screens</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={gaViewsLoading}
                          className="h-7 w-7 border-border bg-muted/50 hover:bg-muted text-muted-foreground shadow-sm"
                          title="Change pages dimension"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[260px]">
                        <DropdownMenuItem
                          onClick={() => setGaPagesDimension('pagePath')}
                          className={gaPagesDimension === 'pagePath' ? 'bg-accent text-accent-foreground' : ''}
                        >
                          Page path + screen class
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setGaPagesDimension('pageTitle')}
                          className={gaPagesDimension === 'pageTitle' ? 'bg-accent text-accent-foreground' : ''}
                        >
                          Page title + screen class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    {gaPagesDimension === 'pageTitle' ? 'Page title and screen class' : 'Page path and screen class'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={gaPagesRange === 'allTime' ? 'default' : 'outline'}
                    onClick={() => setGaPagesRange('allTime')}
                    disabled={gaViewsLoading}
                  >
                    All time
                  </Button>
                  <Button
                    size="sm"
                    variant={gaPagesRange === 'last30Days' ? 'default' : 'outline'}
                    onClick={() => setGaPagesRange('last30Days')}
                    disabled={gaViewsLoading}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    size="sm"
                    variant={gaPagesRange === 'last7Days' ? 'default' : 'outline'}
                    onClick={() => setGaPagesRange('last7Days')}
                    disabled={gaViewsLoading}
                  >
                    Last 7 days
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="overflow-auto rounded-md border border-border">
                <table className="min-w-[720px] w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">
                        {gaPagesDimension === 'pageTitle' ? 'Page title' : 'Page path'}
                      </th>
                      <th className="px-4 py-3 font-medium text-right">Views</th>
                      <th className="px-4 py-3 font-medium text-right">Active users</th>
                      <th className="px-4 py-3 font-medium text-right">Views / active user</th>
                      <th className="px-4 py-3 font-medium text-right">Avg engagement / active user</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card">
                    {(gaPages?.[gaPagesRange] || []).length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                          No data yet.
                        </td>
                      </tr>
                    ) : (
                      (gaPages?.[gaPagesRange] || []).map((row, idx) => (
                        <tr key={`${row?.value || 'row'}-${idx}`} className="border-t border-border">
                          <td className="px-4 py-3 font-mono text-xs text-foreground">
                            {row?.value || '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {Number(row?.views) || 0}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {Number(row?.activeUsers) || 0}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {Number(row?.viewsPerActiveUser) ? Number(row.viewsPerActiveUser).toFixed(2) : '0.00'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {formatDuration(row?.avgEngagementTimePerActiveUser)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Templates</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {analyticsFormsError ? (
                <div className="text-sm text-destructive">{analyticsFormsError}</div>
              ) : (
                (() => {
                  const list = Array.isArray(analyticsForms) ? analyticsForms : []
                  // Some backends mark templates explicitly; fall back to showing whatever the API returns.
                  const hasTemplateFlag = list.some((f) => typeof f?.isTemplate === 'boolean' || typeof f?.template === 'boolean')
                  const rows = hasTemplateFlag ? list.filter((f) => f?.isTemplate || f?.template) : list
                  if (!rows.length) return <div className="text-sm text-muted-foreground py-4">No forms found.</div>
                  return (
                    <div className="overflow-auto rounded-md border border-border">
                      <table className="min-w-[720px] w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr className="text-left text-muted-foreground">
                            <th className="px-4 py-3 font-medium">View</th>
                            <th className="px-4 py-3 font-medium">Form</th>
                            <th className="px-4 py-3 font-medium">Template</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Updated</th>
                          </tr>
                        </thead>
                        <tbody className="bg-card">
                          {rows.map((f) => (
                            <tr key={f._id} className="border-t border-border">
                              <td className="px-4 py-3">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="View template analytics"
                                  onClick={() => router.push(`/forms/template-analytics/${f._id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                              <td className="px-4 py-3 text-foreground font-medium">{f?.name || 'Untitled'}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {typeof f?.isTemplate === 'boolean' ? (f.isTemplate ? 'Yes' : 'No') : (f?.fromTemplate ? 'From template' : '—')}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{f?.status || '—'}</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {f?.updatedAt ? formatDate(f.updatedAt) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()
              )}
            </CardContent>
          </Card>

          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="2xl">
        <DialogContent onClose={() => setShowPreview(false)} className="max-h-[90vh] overflow-y-auto border-2 border-slate-200 shadow-2xl bg-[#f8fafc] p-8">
          <DialogHeader className="border-b border-slate-200 pb-4 mb-6 bg-white rounded-t-lg -m-6 px-6 pt-6">
            <DialogTitle className="text-xl font-bold text-slate-900">Form Preview</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">See how your form will look to users</p>
          </DialogHeader>
          <div className="mt-4">
            {formFields.length === 0 ? (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-300 rounded-lg bg-white">
                <FileText className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No fields to preview. Add fields to your form first.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200" style={{ maxWidth: '600px', margin: '0 auto', overflow: 'hidden' }}>
                <iframe
                  title="Form Preview"
                  sandbox="allow-scripts allow-forms allow-same-origin"
                  srcDoc={generateExportedHTML()}
                  style={{ width: '100%', height: '620px', border: 0, display: 'block' }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={showExport} onClose={() => setShowExport(false)} maxWidth="2xl">
        <DialogContent onClose={() => setShowExport(false)} className="max-h-[90vh] overflow-hidden flex flex-col border-2 border-slate-200 shadow-2xl bg-white">
          <DialogHeader className="border-b border-slate-200 pb-4 mb-4 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-slate-900">Export Form as HTML</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">Copy or download the HTML code to embed in your website</p>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="bg-slate-900 rounded-lg p-4 overflow-auto flex-1 min-h-0 border border-slate-700">
              <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap break-words">
                <code>{exportedHTML}</code>
              </pre>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200 flex-shrink-0">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
              <Button 
                variant="gradient" 
                className="flex-1" 
                onClick={downloadHTML}
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Preview Modal */}
      {previewForm && (
        <Dialog open={!!previewForm} onClose={() => setPreviewForm(null)} maxWidth="2xl">
          <DialogContent onClose={() => setPreviewForm(null)} className="max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b border-border pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold">{previewForm.name}</DialogTitle>
                <button type="button" onClick={() => setPreviewForm(null)} className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden min-h-0">
              {previewLoading ? (
                <div className="flex items-center justify-center py-16">
                  <GlobalLoader variant="inline" size="md" />
                </div>
              ) : previewForm.htmlCode ? (
                <iframe
                  srcDoc={previewForm.htmlCode}
                  className="w-full h-full min-h-[500px] border-0 rounded-lg"
                  title="Form preview"
                  sandbox="allow-forms allow-scripts"
                />
              ) : (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  No preview available for this form.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  )
}

export default function FormsPage() {
  return (
    <Suspense
      fallback={
        <MainLayout title="Form Builder" subtitle="Create and manage forms">
          <div className="flex items-center justify-center py-20">
            <GlobalLoader variant="inline" size="md" />
          </div>
        </MainLayout>
      }
    >
      <FormsPageInner />
    </Suspense>
  )
}
