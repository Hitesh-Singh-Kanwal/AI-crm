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

import { useState, useEffect, useRef } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Bell, MapPin, ChevronDown, Menu, Search, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BranchSelector from '@/components/shared/BranchSelector'
import { getCurrentUser, logout } from '@/lib/auth'
import { getInitials, cn } from '@/lib/utils'
import { isSuperAdmin } from '@/lib/permissions'
import { useInboxHeader } from '@/contexts/InboxHeaderContext'

const INBOX_FILTERS = [
  { value: 'all', label: 'All Customers' },
  { value: 'leads', label: 'Leads' },
  { value: 'teachers', label: 'Teachers' },
]

export default function Header({ title, subtitle, onMenuClick }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef(null)
  const user = getCurrentUser()

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

  const isInbox = pathname?.startsWith('/inbox')
  const isForms = pathname?.startsWith('/forms')
  const isSms = pathname?.startsWith('/sms')
  const isEmails = pathname?.startsWith('/emails')
  const isAICalling = pathname?.startsWith('/ai-calling')
  const inboxFilter = (isInbox && searchParams?.get('filter')) || 'all'
  const formsView = isForms ? (searchParams?.get('view') || 'templates') : null
  const smsView = isSms ? (searchParams?.get('view') || 'templates') : null
  const emailsView = isEmails ? (searchParams?.get('view') || 'templates') : null
  const aiCallingView = isAICalling ? (searchParams?.get('view') || 'scripts') : null

  const setInboxFilter = (value) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('filter', value)
    router.push(`/inbox?${params.toString()}`)
  }

  const setFormsView = (value) => {
    if (!isForms) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/forms?${params.toString()}`)
  }

  const setSmsView = (value) => {
    if (!isSms) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/sms?${params.toString()}`)
  }

  const setEmailsView = (value) => {
    if (!isEmails) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/emails?${params.toString()}`)
  }

  const setAICallingView = (value) => {
    if (!isAICalling) return
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', value)
    router.push(`/ai-calling?${params.toString()}`)
  }

  return (
    <header className="sticky top-0 z-30 min-h-[86px] border-b border-slate-200/80 bg-white">
      <div className="flex min-h-[86px] items-center justify-between px-6">

        {/* LEFT SECTION — ROUTE-SPECIFIC NAV */}
        {isInbox ? (
          <div className="flex items-center h-[44px] rounded-full bg-[#F1F5F9] p-1">
            {INBOX_FILTERS.map(({ value, label }) => {
              const isActive = inboxFilter === value
              const isTeachers = value === 'teachers'

              return (
                <button
                  key={value}
                  onClick={() => setInboxFilter(value)}
                  className={cn(
                    'flex items-center px-5 h-[36px] rounded-full text-sm font-medium transition-all duration-200',

                    isActive
                      ? 'text-[var(--studio-primary)] font-semibold'
                      : 'text-slate-500 hover:text-[var(--studio-primary)]'
                  )}
                >
                  <span>{label}</span>

                  {isTeachers && (
                    <span
                      className={cn(
                        'ml-2 min-w-[22px] h-5 px-2 rounded-full text-xs flex items-center justify-center',
                        isActive
                          ? 'bg-[var(--studio-primary-light)] text-[var(--studio-primary)]'
                          : 'bg-slate-200 text-slate-600'
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
            <div className="flex items-center gap-8 rounded-full bg-[#F1F5F9] px-6 py-2">
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
                      'text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-[var(--studio-primary)]' : 'text-slate-500'
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
            <div className="flex items-center gap-8 rounded-full bg-[#F1F5F9] px-6 py-2">
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
                      'text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-[var(--studio-primary)]' : 'text-slate-500'
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
            <div className="flex items-center gap-8 rounded-full bg-[#F1F5F9] px-6 py-2">
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
                      'text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-[var(--studio-primary)]' : 'text-slate-500'
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
            <div className="flex items-center gap-8 rounded-full bg-[#F1F5F9] px-6 py-2">
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
                      'text-sm font-medium transition-colors duration-200',
                      isActive ? 'text-[var(--studio-primary)]' : 'text-slate-500'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-6">

          {/* MOBILE MENU */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden h-[38px] w-[38px] rounded-lg text-slate-600"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* SEARCH + NOTIFICATION PILL */}
          <div className="flex items-center h-[38px] gap-1 rounded-full bg-slate-100 px-0.5">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="h-[38px] w-[38px] rounded-full text-slate-500 hover:bg-slate-200/80"
              >
                <Bell className="h-5 w-5" />
              </Button>

              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-semibold text-sm text-slate-900">
                        Notifications
                      </h3>
                    </div>
                    <div className="p-4 text-sm text-slate-500">
                      No new notifications.
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-[38px] w-[38px] rounded-full text-slate-500 hover:bg-slate-200/80"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>

          {/* BRANCH SELECTOR */}
          <div className="w-[200px]">
            {isSuperAdmin() ? (
              <BranchSelector />
            ) : (
              <div className="flex items-center justify-between gap-2 h-[38px] px-3 rounded-full bg-[#F1F5F9]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-5 w-5 text-[#94A3B8]" />
                  <span className="text-sm truncate text-[#94A3B8]">
                    {user?.branchName || 'All Branch'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
              </div>
            )}
          </div>

          {/* USER PROFILE – click to open dropdown with Logout */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-100 transition-colors text-left min-w-0"
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
            >
              <div className="h-[38px] w-[38px] rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                {user ? getInitials(user.name) : '?'}
              </div>
              <div className="flex flex-col min-w-0 max-w-[140px] sm:max-w-none hidden sm:flex items-start">
                <span className="block text-sm text-[#050312] leading-tight truncate w-full">
                  {user ? `Hi, ${user.name}` : 'Hi, User'}
                </span>
                <span className="block text-xs text-[#94A3B8] leading-tight mt-1 truncate w-full">
                  {user?.email || '—'}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-48 z-50 rounded-lg border border-slate-200 bg-white shadow-lg py-1"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}