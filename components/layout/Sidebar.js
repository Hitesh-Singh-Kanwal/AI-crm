'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  UserPlus,
  Calendar,
  Megaphone,
  BarChart3,
  Bot,
  Settings,
  Phone,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentUser } from '@/lib/auth'
import { canAccessRoute } from '@/lib/permissions'

// Figma: exact nav items and labels from Studio CRM sidebar (node 380-4220)
const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Inbox',
    href: '/inbox',
    icon: Inbox,
    children: [
      { name: 'All Messages', href: '/inbox' },
      { name: 'Human Queue', href: '/human-queue' },
      { name: 'Calls', href: '/inbox?channel=Call' },
    ],
  },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  {
    name: 'Marketing',
    href: '/forms',
    icon: Megaphone,
    children: [
      { name: 'Forms', href: '/forms' },
      { name: 'Campaigns', href: '/campaigns' },
      { name: 'Email Builder', href: '/emails' },
      { name: 'SMS Builder', href: '/sms' },
    ]
  },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  {
    name: 'AI & Automation',
    href: '/workflows',
    icon: Bot,
    children: [
      { name: 'Make Calls', href: '/make-calls' },
      { name: 'AI Calling', href: '/ai-calling' },
      { name: 'Workflows', href: '/workflows' },
      { name: 'AI Calls Data', href: '/aiCallDetail' },
      { name: 'Training', href: '/training' },
    ],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { name: 'Studio Locations', href: '/locations' },
      { name: 'Users', href: '/users' },
      { name: 'Roles & Permissions', href: '/roles' },
      { name: 'Integrations', href: '/integrations' },
      { name: 'Billing', href: '/billing' },
    ],
  },
]

// Figma: exact activity card text from Subscription Section
const upcomingTasks = [
  { title: 'Email sent to Sarah Hahnson', description: 'Sent proposal for marketing automation' },
  { title: 'Call with Michael Chen', description: 'Discussed enterprise requirements and pricing' },
  { title: 'Team sync meeting', description: 'Weekly sales pipeline review' },
  { title: 'Note added to David Kim', description: 'Interested in expanding current subscription' },
  { title: 'Task Completed', description: 'Sent follow-up email to GlobalSoft' },
]

// Image path for Upcoming Tasks memoji – place your image at public/images/sidebar-memoji.png
const MEMOJI_IMAGE_PATH = '/images/sidebar-memoji.png'

function UpcomingTasksMemoji() {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div
        className="flex-shrink-0 rounded bg-gray-100"
        style={{ width: 80, height: 60 }}
        aria-hidden
      />
    )
  }

  return (
    <div className="flex-shrink-0 rounded overflow-hidden" style={{ width: 80, height: 60 }}>
      <Image
        src={MEMOJI_IMAGE_PATH}
        alt=""
        width={80}
        height={60}
        className="object-cover w-full h-full"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  )
}

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const pathname = usePathname()
  const user = getCurrentUser()
  const [openMenu, setOpenMenu] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    setMobileOpen(false)
    setOpenMenu(null)
  }, [pathname, setMobileOpen])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen])

  if (!user) return null

  const studioName = user.branchName || 'ABC Studio'

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Side bar - Figma: W 212 + padding, H fit, gap 24, padding 4; no scroll */}
      <aside
        className={cn(
          'flex flex-col h-screen transition-all duration-300',
          'md:relative fixed inset-y-0 left-0 z-50',
          'w-[244px] min-w-[244px]',
          mobileOpen ? 'flex translate-x-0' : 'hidden md:flex -translate-x-full md:translate-x-0',
          'bg-gradient-to-b from-[#4CC9F0] to-[#F72585]'
        )}
        style={{ padding: '24px 16px', gap: 24 }}
      >
        {/* Welcome + Menu - flex-1 min-h-0, no scroll, gap 24 (Figma auto layout) */}
        <div className="flex flex-col flex-1 min-h-0" style={{ gap: 24 }}>
          <div className="flex flex-col flex-shrink-0" style={{ gap: 4 }}>
            {/* Logo Section - Figma: column, gap 4px */}
            <div className="flex flex-col flex-shrink-0" style={{ gap: 4 }}>
              <div
                className="rounded-full flex-shrink-0 bg-[#7704D3]"
                style={{ width: 32, height: 32 }}
                aria-hidden
              />
              <div className="flex flex-col flex-shrink-0">
                <p
                  className="font-medium text-[#F9FAFB] leading-tight"
                  style={{ fontFamily: 'Inter', fontSize: 18, lineHeight: 1.44 }}
                >
                  Welcome Back,<br />
                  {studioName}
                </p>
                {/* <p
                  className="text-[#F9FAFB] flex-shrink-0"
                  style={{ fontFamily: 'Inter', fontSize: 10, lineHeight: 1.43 }}
                >
                  Last Update, 3 Feb 2026
                </p> */}
              </div>
            </div>

            {/* Menu Section - Figma: borderRadius 0 24px 24px 0, padding 20px 0, gap 20px */}
            <div
              ref={menuRef}
              className="flex flex-col flex-shrink-0 w-full"
              style={{
                borderRadius: '0 24px 24px 0',
                padding: '20px 0',
                gap: 20,
              }}
            >
              {navItems.map((item) => {
                const hasAccess = item.href ? canAccessRoute(item.href) : true
                if (!hasAccess && !item.children) return null

                const hasChildren = item.children && item.children.length > 0
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : (item.href && pathname.startsWith(item.href)) || (hasChildren && item.children.some(c => pathname.startsWith(c.href)))

                const Icon = item.icon

                return (
                  <div
                    key={item.name}
                    className="relative w-full"
                    onMouseEnter={() => {
                      if (hasChildren) setOpenMenu(item.name)
                    }}
                    onMouseLeave={() => {
                      if (hasChildren) setOpenMenu(null)
                    }}
                  >
                    {hasChildren ? (
                      <div className="relative inline-flex">
                        <button
                          onClick={() => setOpenMenu(openMenu === item.name ? null : item.name)}
                          className={cn(
                            'flex flex-row items-center gap-2 w-full flex-shrink-0 hover:text-[#cb17a7]',
                            isActive ? 'text-[#cb17a7]' : 'text-[#F9FAFB] font-normal'
                          )}
                          style={{ fontFamily: 'Inter', fontSize: 14, lineHeight: 1.43 }}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
                          <span>{item.name}</span>
                        </button>

                        {openMenu === item.name && (
                          <div className="absolute left-[calc(100%+10px)] top-0 w-[200px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] py-3 z-[60] border border-gray-100/50">
                            <div className="px-5 mb-2 text-xs font-semibold tracking-wider text-[#94A3B8] uppercase">
                              {item.name}
                            </div>
                            <div className="h-px bg-gray-100 mb-2 mx-2" />
                            <div className="flex flex-col">
                              {item.children.map(child => {
                                const isChildActive = pathname === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => {
                                      setOpenMenu(null)
                                      setMobileOpen(false)
                                    }}
                                    className={cn(
                                      "px-5 py-2.5 text-sm transition-colors block w-full text-left",
                                      isChildActive
                                        ? "text-[#cb17a7] bg-pink-50/50"
                                        : "text-[#475569] hover:bg-gray-50 hover:text-[#0F172A]"
                                    )}
                                  >
                                    {child.name}
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setOpenMenu(null)}
                        className={cn(
                          'flex flex-row items-center gap-2 w-full flex-shrink-0 hover:text-[#cb17a7]',
                          isActive ? 'text-[#cb17a7]' : 'text-[#F9FAFB] font-normal'
                        )}
                        style={{ fontFamily: 'Inter', fontSize: 14, lineHeight: 1.43 }}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} aria-hidden />
                        <span>{item.name}</span>
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Subscription Section - memoji image above Upcoming Tasks */}
        <div
          className="flex flex-col flex-shrink-0 items-center rounded-2xl bg-white self-center"
          style={{
            width: 212,
            borderRadius: 16,
            padding: 8,
            gap: 4,
          }}
        >
          {/* <UpcomingTasksMemoji /> */}
          <div className="flex flex-col w-full flex-shrink-0" style={{ gap: 4 }}>
            <p
              className="font-bold text-[#CD3358] w-full text-left"
              style={{ fontFamily: 'Inter', fontSize: 12, lineHeight: 1.5 }}
            >
              Upcoming Tasks
            </p>
            <div
              className="w-full h-px bg-gradient-to-r from-transparent via-[#E0E1E2] to-transparent opacity-90"
              style={{ maxWidth: 196 }}
            />
            {upcomingTasks.map((task, i) => (
              <div key={i} className="flex flex-col w-full" style={{ gap: 0 }}>
                <p
                  className="font-medium text-[#0F172A]"
                  style={{ fontFamily: 'Inter', fontSize: 10, lineHeight: 1.6 }}
                >
                  {task.title}
                </p>
                <p
                  className="text-[#94A3B8]"
                  style={{ fontFamily: 'Inter', fontSize: 10, lineHeight: 1.6 }}
                >
                  {task.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile close button - absolute so it doesn't affect layout */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="md:hidden fixed top-6 left-[228px] z-[60] p-2 rounded-lg bg-white/90 text-gray-700 shadow"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
