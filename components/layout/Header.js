// 'use client'

// import { useState } from 'react'
// import { usePathname, useSearchParams, useRouter } from 'next/navigation'
// import { Bell, MapPin, ChevronDown, Menu, Search } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import BranchSelector from '@/components/shared/BranchSelector'
// import { getCurrentUser } from '@/lib/auth'
// import { getInitials } from '@/lib/utils'
// import { isSuperAdmin } from '@/lib/permissions'
// import { cn } from '@/lib/utils'
// import { useInboxHeader } from '@/contexts/InboxHeaderContext'

// const INBOX_FILTERS = [
//   { value: 'all', label: 'All Customers' },
//   { value: 'leads', label: 'Leads' },
//   { value: 'teachers', label: 'Teachers' },
// ]

// /**
//  * Header matching Figma highlighted section: W 1204 H 86, Auto layout, Gap 24px, Padding 24px.
//  * On Inbox: left = All Customers | Leads | Teachers tabs; right = search+notification | All Branch | profile.
//  */
// export default function Header({ title, subtitle, onMenuClick }) {
//   const [showNotifications, setShowNotifications] = useState(false)
//   const user = getCurrentUser()
//   const { inboxTeachersCount } = useInboxHeader()
//   const pathname = usePathname()
//   const searchParams = useSearchParams()
//   const router = useRouter()
//   const isInbox = pathname?.startsWith('/inbox')
//   const inboxFilter = (isInbox && searchParams?.get('filter')) || 'all'

//   const setInboxFilter = (value) => {
//     const params = new URLSearchParams(searchParams?.toString() || '')
//     params.set('filter', value)
//     router.push(`/inbox?${params.toString()}`)
//   }

//   return (
//     <header className="sticky top-0 z-30 min-h-[86px] border-b border-slate-200/80 bg-white">
//       <div className="flex min-h-[86px] items-center justify-between gap-6 px-6">
//         {/* Left: on Inbox show 3 filter tabs (All Customers, Leads, Teachers); else spacer for right alignment */}
//         {isInbox ? (
//           <div className="flex h-[38px] items-center gap-5 shrink-0">
//             {INBOX_FILTERS.map(({ value, label }) => {
//               const isActive = inboxFilter === value
//               const isTeachers = value === 'teachers'
//               return (
//                 <button
//                   key={value}
//                   onClick={() => setInboxFilter(value)}
//                   className={cn(
//                     'h-[38px] px-4 rounded-full text-sm font-normal transition-colors shrink-0',
//                     isActive
//                       ? 'bg-[var(--studio-primary)] text-white'
//                       : 'bg-transparent text-[var(--studio-primary)] hover:bg-[var(--studio-primary-light)]'
//                   )}
//                 >
//                   {isTeachers ? (
//                     <span className="flex items-center gap-2">
//                       <span>{label}</span>
//                       <span
//                         className={cn(
//                           'min-w-[24px] h-6 px-2 rounded-full text-xs font-medium flex items-center justify-center',
//                           isActive
//                             ? 'bg-white text-[var(--studio-primary)]'
//                             : 'bg-[var(--studio-primary-light)] text-[var(--studio-primary)]'
//                         )}
//                       >
//                         {inboxTeachersCount}
//                       </span>
//                     </span>
//                   ) : (
//                     label
//                   )}
//                 </button>
//               )
//             })}
//           </div>
//         ) : (
//           <div className="flex-1" />
//         )}

//         {/* Right: menu (mobile) + search+notification pill + All Branch + profile */}
//         <div className="flex items-center gap-6 shrink-0">
//         {/* Mobile: menu on far left */}
//         <Button
//           variant="ghost"
//           size="icon"
//           onClick={onMenuClick}
//           className="md:hidden h-[38px] w-[38px] rounded-lg text-slate-600 absolute left-4"
//           aria-label="Open menu"
//         >
//           <Menu className="h-5 w-5" />
//         </Button>

//         {/* Right-aligned block: Search+Notification combined | All Branch | User profile */}
//         <div className="flex items-center gap-6">
//         {/* 1. Notification + Search combined – pill container, inner elements 38px */}
//         <div className="flex items-center h-[38px] gap-1 rounded-full bg-slate-100 shrink-0 px-0.5">
//           <div className="relative">
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={() => setShowNotifications(!showNotifications)}
//               className="h-[38px] w-[38px] rounded-full text-slate-500 hover:bg-slate-200/80 shrink-0"
//               aria-label="Notifications"
//             >
//               <Bell className="h-5 w-5" />
//             </Button>
//             {showNotifications && (
//               <>
//                 <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
//                 <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-slate-200 bg-white shadow-xl">
//                   <div className="p-4 border-b border-slate-200">
//                     <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
//                   </div>
//                   <div className="p-4 text-sm text-slate-500">No new notifications.</div>
//                 </div>
//               </>
//             )}
//           </div>
//           <Button
//             variant="ghost"
//             size="icon"
//             className="h-[38px] w-[38px] rounded-full text-slate-500 hover:bg-slate-200/80 shrink-0"
//             aria-label="Search"
//           >
//             <Search className="h-5 w-5" />
//           </Button>
//         </div>

//         {/* 2. All Branch – backend-connected; UI only. Super admin = dropdown, others = read-only label */}
//         <div className="w-[200px] shrink-0">
//           {isSuperAdmin() ? (
//             <BranchSelector />
//           ) : (
//             <div
//               className={cn(
//                 'flex items-center justify-between gap-2 h-[38px] px-3 rounded-[32px]',
//                 'bg-[#F1F5F9]'
//               )}
//             >
//               <div className="flex items-center gap-1.5 min-w-0">
//                 <MapPin className="h-5 w-5 shrink-0 text-[#94A3B8]" />
//                 <span className="text-sm font-normal truncate" style={{ color: '#94A3B8' }}>
//                   {user?.branchName || 'All Branch'}
//                 </span>
//               </div>
//               <ChevronDown className="h-4 w-4 shrink-0 text-[#94A3B8]" />
//             </div>
//           )}
//         </div>

//         {/* 3. User profile – avatar + name (line 1) + email (line 2, below name) */}
//         <div className="flex items-center gap-2 shrink-0">
//           <div
//             className="h-[38px] w-[38px] rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0"
//             aria-hidden
//           >
//             {user ? getInitials(user.name) : '?'}
//           </div>
//           <div className="flex flex-col items-start min-w-0 hidden sm:block">
//             <span className="text-sm font-normal text-[#050312] block leading-tight">
//               {user ? `Hi, ${user.name || 'User'}` : 'Hi, User'}
//             </span>
//             <span className="text-xs font-normal text-[#94A3B8] block leading-tight mt-0.5">
//               {user?.email || '—'}
//             </span>
//           </div>
//         </div>
//         </div>
//       </div>
//       </div>
//     </header>
//   );
// }



'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Bell, MapPin, ChevronDown, Menu, Search, LogOut, Moon, Sun, Plus } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import BranchSelector from '@/components/shared/BranchSelector'
import { getCurrentUser, logout } from '@/lib/auth'
import { getInitials, cn } from '@/lib/utils'
import { isSuperAdmin } from '@/lib/permissions'
import { useInboxHeader } from '@/contexts/InboxHeaderContext'
import api from '@/lib/api'
import NewEnrollmentPackageInline from '@/app/calendar/components/NewEnrollmentPackageInline'

const INBOX_FILTERS = [
  { value: 'all', label: 'All Customers' },
  { value: 'leads', label: 'Leads' },
  { value: 'teachers', label: 'Teachers' },
]

export default function Header({ title, subtitle, onMenuClick, mobileMenuOpen = false }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [createEnrollmentOpen, setCreateEnrollmentOpen] = useState(false)
  const [creatingEnrollment, setCreatingEnrollment] = useState(false)
  const [createEnrollmentError, setCreateEnrollmentError] = useState('')
  const [selectedCustomerID, setSelectedCustomerID] = useState('')
  const [teacherOptions, setTeacherOptions] = useState([])
  const [customerOptions, setCustomerOptions] = useState([])
  const [packageTemplates, setPackageTemplates] = useState([])
  const profileRef = useRef(null)
  const user = getCurrentUser()
  const shortName = (user?.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0]
  const { theme, setTheme, mounted: themeMounted } = useTheme()

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showProfileMenu])
  const { inboxTeachersCount } = useInboxHeader()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const isInbox =
    pathname === '/inbox' ||
    pathname === '/inbox/all-messages' ||
    pathname === '/inbox/talk-to-assistant'
  const isForms = pathname?.startsWith('/marketing/form-builder')
  const isSms = pathname?.startsWith('/marketing/sms-builder')
  const isEmails = pathname?.startsWith('/marketing/email-builder')
  const isAICalling = pathname?.startsWith('/ai-automation/ai-calling')
  const isWorkflows = pathname?.startsWith('/ai-automation/workflows')
  const inboxFilter = (isInbox && searchParams?.get('filter')) || 'all'
  const formsView = isForms ? (searchParams?.get('view') || 'templates') : null
  const smsView = isSms ? (searchParams?.get('view') || 'templates') : null
  const emailsView = isEmails ? (searchParams?.get('view') || 'templates') : null
  const aiCallingView = isAICalling ? (searchParams?.get('view') || 'scripts') : null
  const workflowsView = isWorkflows ? (searchParams?.get('view') || 'active') : null

  useEffect(() => {
    if (!createEnrollmentOpen) return
    let cancelled = false
    async function loadCreateEnrollmentOptions() {
      setCreateEnrollmentError('')
      const [teachersRes, customersRes, packagesRes] = await Promise.all([
        api.get('/api/teacher?limit=200&status=active'),
        api.get('/api/customer?limit=200'),
        api.get('/api/package?limit=200'),
      ])
      if (cancelled) return
      if (teachersRes?.success && Array.isArray(teachersRes.data)) {
        setTeacherOptions(
          teachersRes.data.map((t) => ({
            value: String(t._id ?? t.id),
            label: t.name || t.email || String(t._id),
          })),
        )
      }
      if (customersRes?.success && Array.isArray(customersRes.data)) {
        setCustomerOptions(
          customersRes.data.map((c) => ({
            value: String(c._id ?? c.id),
            label: c.name || c.email || String(c._id),
          })),
        )
      }
      if (packagesRes?.success && Array.isArray(packagesRes.data)) {
        setPackageTemplates(packagesRes.data)
      }
    }
    loadCreateEnrollmentOptions()
    return () => {
      cancelled = true
    }
  }, [createEnrollmentOpen])

  const selectedCustomerLabel = useMemo(() => {
    const opt = customerOptions.find((c) => c.value === selectedCustomerID)
    return opt?.label || ''
  }, [customerOptions, selectedCustomerID])

  async function handleCreateEnrollmentAndPackage(payload) {
    if (!selectedCustomerID) {
      setCreateEnrollmentError('Please select a student.')
      return false
    }
    setCreateEnrollmentError('')
    setCreatingEnrollment(true)
    setSelectedCustomerID((v) => v) // keep selection

    const enrRes = await api.post('/api/enrollment', {
      customerID: selectedCustomerID,
      label: payload?.label?.trim() || undefined,
      teacherID: payload?.teacherID || undefined,
    })
    if (!enrRes?.success) {
      setCreateEnrollmentError(enrRes?.error || 'Failed to create enrollment.')
      setCreatingEnrollment(false)
      return false
    }

    const created =
      enrRes?.data?.enrollment && typeof enrRes.data.enrollment === 'object'
        ? enrRes.data.enrollment
        : enrRes.data
    const enrollmentID = String(created?._id || created?.enrollmentID || '')
    if (!enrollmentID) {
      setCreateEnrollmentError('Enrollment created but ID was not returned.')
      setCreatingEnrollment(false)
      return false
    }

    const addRes = await api.post('/api/customer-package/add', {
      customerID: selectedCustomerID,
      packageID: payload.packageID,
      enrollmentID,
      discountType: payload.discountType,
      discountAmount: Number(payload.discountAmount || 0),
      services: (payload.services || []).map((s) => ({
        serviceCode: s.serviceCode,
        serviceName: s.serviceName,
        color: s.color,
        numberOfSessions: Number(s.numberOfSessions || 0),
        pricePerSession: Number(s.pricePerSession || 0),
        finalAmount: Number(s.finalAmount || 0),
      })),
      billingType: payload.billingType,
      billing:
        payload.billingType === 'one_time'
          ? { method: payload.billing?.method || 'cash' }
          : payload.billingType === 'payment_plan'
            ? {
                numberOfInstallments: Number(payload.billing?.numberOfInstallments || 0),
                frequency: payload.billing?.frequency,
                startDate: payload.billing?.startDate,
              }
            : {},
      ...(payload.purchaseDate ? { purchaseDate: payload.purchaseDate } : {}),
    })

    if (!addRes?.success) {
      setCreateEnrollmentError(addRes?.error || 'Failed to add package to enrollment.')
      setCreatingEnrollment(false)
      return false
    }

    setCreatingEnrollment(false)
    setCreateEnrollmentOpen(false)
    setSelectedCustomerID('')
    return true
  }

  const setInboxFilter = (value) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('filter', value)
    const base = pathname === '/inbox/all-messages' ? '/inbox/all-messages' : '/inbox'
    router.push(`${base}?${params.toString()}`)
  }

  const setFormsView = (value) => {
    if (!isForms) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/marketing/form-builder?${params.toString()}`)
  }

  const setSmsView = (value) => {
    if (!isSms) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/marketing/sms-builder?${params.toString()}`)
  }

  const setEmailsView = (value) => {
    if (!isEmails) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/marketing/email-builder?${params.toString()}`)
  }

  const setAICallingView = (value) => {
    if (!isAICalling) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/ai-automation/ai-calling?${params.toString()}`)
  }

  const setWorkflowsView = (value) => {
    if (!isWorkflows) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/ai-automation/workflows?${params.toString()}`)
  }

  return (
    <>
    <header className="sticky top-0 z-30 border-b py-3 border-border bg-background">
      <div className="flex flex-col gap-3 px-3 sm:px-4 lg:px-6 lg:flex-row lg:items-center lg:justify-between">

        {/* LEFT SECTION — ROUTE-SPECIFIC NAV */}
        <div className="order-2 lg:order-1 w-full min-w-0 overflow-x-auto scrollbar-hide lg:flex-1 lg:pr-2">
          {isInbox ? (
            <div className="flex w-max items-center h-[44px] rounded-full bg-muted p-1">
              {INBOX_FILTERS.map(({ value, label }) => {
                const isActive = inboxFilter === value
                const isTeachers = value === 'teachers'

                return (
                  <button
                    key={value}
                    onClick={() => setInboxFilter(value)}
                    className={cn(
                      'flex items-center px-4 sm:px-5 h-[36px] rounded-full text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'text-[var(--studio-primary)] font-semibold'
                        : 'text-muted-foreground hover:text-[var(--studio-primary)]'
                    )}
                  >
                    <span>{label}</span>

                    {isTeachers && (
                      <span
                        className={cn(
                          'ml-2 min-w-[22px] h-5 px-2 rounded-full text-xs flex items-center justify-center',
                          isActive
                            ? 'bg-[var(--studio-primary-light)] text-[var(--studio-primary)]'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {inboxTeachersCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : isForms ? (
            <div className="flex items-center h-[44px]">
              <div className="flex w-max items-center gap-5 sm:gap-8 rounded-full bg-muted px-4 sm:px-6 py-2">
                {[
                  { value: 'templates', label: 'Templates' },
                  { value: 'builder', label: 'Form Builder' },
                  { value: 'analytics', label: 'Analytics' },
                ].map(({ value, label }) => {
                  const isActive = formsView === value
                  return (
                    <button
                      key={value}
                      onClick={() => setFormsView(value)}
                      className={cn(
                        'text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                        isActive ? 'text-[var(--studio-primary)]' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : isSms ? (
            <div className="flex items-center h-[44px]">
              <div className="flex w-max items-center gap-5 sm:gap-8 rounded-full bg-muted px-4 sm:px-6 py-2">
                {[
                  { value: 'templates', label: 'SMS Templates' },
                  { value: 'creator', label: 'SMS Creator' },
                  { value: 'analytics', label: 'Analytics' },
                ].map(({ value, label }) => {
                  const isActive = smsView === value
                  return (
                    <button
                      key={value}
                      onClick={() => setSmsView(value)}
                      className={cn(
                        'text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                        isActive ? 'text-[var(--studio-primary)]' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : isEmails ? (
            <div className="flex items-center h-[44px]">
              <div className="flex w-max items-center gap-5 sm:gap-8 rounded-full bg-muted px-4 sm:px-6 py-2">
                {[
                  { value: 'templates', label: 'Templates' },
                  { value: 'builder', label: 'Email Builder' },
                  { value: 'analytics', label: 'Analytics' },
                ].map(({ value, label }) => {
                  const isActive = emailsView === value
                  return (
                    <button
                      key={value}
                      onClick={() => setEmailsView(value)}
                      className={cn(
                        'text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                        isActive ? 'text-[var(--studio-primary)]' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : isAICalling ? (
            <div className="flex items-center h-[44px]">
              <div className="flex w-max items-center gap-5 sm:gap-8 rounded-full bg-muted px-4 sm:px-6 py-2">
                {[
                  { value: 'scripts', label: 'Scripts' },
                  { value: 'personas', label: 'AI Personas' },
                  { value: 'knowledge', label: 'Knowledge Base' },
                  { value: 'assistants', label: 'AI Assist' },
                ].map(({ value, label }) => {
                  const isActive = aiCallingView === value
                  return (
                    <button
                      key={value}
                      onClick={() => setAICallingView(value)}
                      className={cn(
                        'text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                        isActive ? 'text-[var(--studio-primary)]' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : isWorkflows ? (
            <div className="flex items-center h-[44px]">
              <div className="flex w-max items-center gap-5 sm:gap-8 rounded-full bg-muted px-4 sm:px-6 py-2">
                {[
                  { value: 'active', label: 'Active (3)' },
                  { value: 'paused', label: 'Paused (1)' },
                  { value: 'drafts', label: 'Drafts (0)' },
                  { value: 'analytics', label: 'Analytics' },
                ].map(({ value, label }) => {
                  const isActive = workflowsView === value
                  return (
                    <button
                      key={value}
                      onClick={() => setWorkflowsView(value)}
                      className={cn(
                        'text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                        isActive ? 'text-[var(--studio-primary)]' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT SECTION */}
        <div className="order-1 lg:order-2 w-full lg:w-auto flex items-center justify-between lg:justify-end gap-2 sm:gap-3 lg:gap-4 xl:gap-6 shrink-0">

          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className={cn(
                'h-[38px] w-[38px] rounded-lg text-muted-foreground',
                mobileMenuOpen && 'bg-muted text-foreground'
              )}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 xl:gap-6 ml-auto">

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[38px] w-[38px] rounded-full text-muted-foreground hover:bg-muted shrink-0"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {!themeMounted ? (
                <Sun className="h-5 w-5 opacity-60" aria-hidden />
              ) : theme === 'dark' ? (
                <Sun className="h-5 w-5" aria-hidden />
              ) : (
                <Moon className="h-5 w-5" aria-hidden />
              )}
            </Button>

            {/* SEARCH + NOTIFICATION PILL */}
            <div className="hidden sm:flex items-center h-[38px] gap-1 rounded-full bg-muted px-0.5">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="h-[38px] w-[38px] rounded-full text-muted-foreground hover:bg-muted/80"
                >
                  <Bell className="h-5 w-5" />
                </Button>

                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl">
                      <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-sm">
                          Notifications
                        </h3>
                      </div>
                      <div className="p-4 text-sm text-muted-foreground">
                        No new notifications.
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-[38px] w-[38px] rounded-full text-muted-foreground hover:bg-muted/80"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>

            {/* BRANCH SELECTOR */}
            <div className="hidden md:block w-[170px] lg:w-[200px]">
              {isSuperAdmin() ? (
                <BranchSelector />
              ) : (
                <div className="flex items-center justify-between gap-2 h-[38px] px-3 rounded-full bg-muted">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm truncate text-muted-foreground">
                      {user?.branchName || 'All Branch'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* CREATE ENROLLMENT (desktop only) */}
            <Button
              type="button"
              className="hidden md:inline-flex h-[38px] rounded-full px-4 text-[13px] font-semibold bg-brand text-brand-foreground hover:bg-brand-dark"
              onClick={() => setCreateEnrollmentOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Enrollment
            </Button>

            {/* USER PROFILE – click to open dropdown with Logout */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted transition-colors text-left min-w-0"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className="h-[38px] w-[38px] rounded-full bg-brand flex items-center justify-center text-sm font-semibold text-brand-foreground shrink-0">
                  {user ? getInitials(user.name) : '?'}
                </div>
                <div className="hidden xl:flex flex-col min-w-0 max-w-[140px] xl:max-w-none items-start">
                  <span className="block text-sm text-foreground leading-tight truncate w-full">
                    {user ? `Hi, ${shortName || 'User'}` : 'Hi, User'}
                  </span>
                  <span className="block text-xs text-muted-foreground leading-tight mt-1 truncate w-full">
                    {user?.email || '—'}
                  </span>
                </div>
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg py-1"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

    <Sheet open={createEnrollmentOpen} onClose={() => { setCreateEnrollmentOpen(false); setCreateEnrollmentError(''); setSelectedCustomerID('') }}>
      <SheetContent className="flex flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b border-border bg-muted/30 px-5 pt-5 pb-3">
          <p className="text-[14px] font-bold text-foreground">Create Enrollment</p>
          <p className="text-[12px] text-muted-foreground mt-1">Create enrollment and package in one go.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Student</p>
            <div className="relative">
              <select
                value={selectedCustomerID}
                onChange={(e) => setSelectedCustomerID(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] outline-none focus:border-primary"
              >
                <option value="">Select student…</option>
                {customerOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            {selectedCustomerLabel && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate">Selected: {selectedCustomerLabel}</p>
            )}
          </div>

          <NewEnrollmentPackageInline
            teacherOptions={teacherOptions}
            packageTemplates={packageTemplates}
            onCancel={() => { setCreateEnrollmentOpen(false); setCreateEnrollmentError(''); setSelectedCustomerID('') }}
            onSubmit={handleCreateEnrollmentAndPackage}
          />

          {createEnrollmentError && (
            <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12px] text-destructive">
              {createEnrollmentError}
            </div>
          )}
          {creatingEnrollment && (
            <p className="mt-2 text-[11px] text-muted-foreground">Creating…</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
