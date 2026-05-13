'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getCurrentUser } from '@/lib/auth'
import { canAccessRoute } from '@/lib/permissions'
import { upcomingTasks as sidebarUpcomingTasks } from '@/data/dummyData'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', iconSrc: '/figma/sidebar/dashboard-selected.svg', iconSize: 24, labelStyle: 'bold' },
  {
    name: 'Inbox',
    href: '/inbox',
    iconSrc: '/figma/sidebar/inbox.svg',
    iconSize: 20,
    labelStyle: 'regular',
    children: [
      { name: 'All Messages', href: '/inbox/all-messages' },
      { name: 'Human Queue', href: '/inbox/human-queue' },
      { name: 'Calls', href: '/inbox/calls' },
      { name: 'Talk to Assistant', href: '/inbox/talk-to-assistant' },
    ],
  },
  { name: 'Leads', href: '/leads', iconSrc: '/figma/sidebar/leads.svg', iconSize: 20, labelStyle: 'regular' },
  { name: 'Customers', href: '/settings/users-roles/customers', iconSrc: '/figma/sidebar/customers.svg', iconSize: 20, labelStyle: 'regular' },
  {
    name: 'Calendar',
    href: '/calendar',
    iconSrc: '/figma/sidebar/calendar.svg',
    iconSize: 20,
    labelStyle: 'regular',
    children: [
      { name: 'Calendar', href: '/calendar' },
    ],
  },
  {
    name: 'Marketing',
    href: '/marketing/form-builder',
    iconSrc: '/figma/sidebar/marketing.svg',
    iconSize: 20,
    labelStyle: 'regular14',
    children: [
      { name: 'Form Builder', href: '/marketing/form-builder' },
      { name: 'Campaigns', href: '/marketing/campaigns' },
      { name: 'Email Builder', href: '/marketing/email-builder' },
      { name: 'SMS Builder', href: '/marketing/sms-builder' },
    ],
  },
  { name: 'Reports', href: '/reports', iconSrc: '/figma/sidebar/reports.svg', iconSize: 20, labelStyle: 'regular' },
  {
    name: 'AI & Automation',
    href: '/ai-automation/workflows',
    iconSrc: '/figma/sidebar/ai-automation.svg',
    iconSize: 20,
    labelStyle: 'regular',
    children: [
      { name: 'Make Calls', href: '/ai-automation/make-calls' },
      { name: 'AI Calling', href: '/ai-automation/ai-calling' },
      { name: 'Workflows', href: '/ai-automation/workflows' },
      { name: 'AI Calls Data', href: '/ai-automation/ai-calling-data' },
      { name: 'Training', href: '/ai-automation/training' },
      { name: 'AI SMS', href: '/ai-automation/ai-sms' },
    ],
  },
  { name: 'Workflow', href: '/workflow', iconSrc: '/figma/sidebar/ai-automation.svg', iconSize: 20, labelStyle: 'regular' },
  {
    name: 'Settings',
    href: '/settings/studio',
    iconSrc: '/figma/sidebar/settings.svg',
    iconSize: 20,
    labelStyle: 'regular',
    children: [
      { name: 'Studio', href: '/settings/studio' },
      { name: 'Setup', href: '/settings/setup' },
      { name: 'Integrations', href: '/settings/integrations' },
      { name: 'Billing', href: '/settings/billing' },
      { name: 'Activity Log', href: '/settings/activity-log' },
    ],
  },
]

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const pathname = usePathname()
  const user = getCurrentUser()
  const [openMenu, setOpenMenu] = useState(null) // string | null
  const [menuAnchorRect, setMenuAnchorRect] = useState(null) // DOMRectLike | null
  const [menuPos, setMenuPos] = useState(null) // { top:number, left:number } | null
  const dropdownRef = useRef(null)
  const sidebarRef = useRef(null)
  const closeTimerRef = useRef(null)
  const menuHoverRef = useRef(false)

  const menuItemsByName = useMemo(() => {
    const map = new Map()
    for (const item of navItems) map.set(item.name, item)
    return map
  }, [])

  const taskDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    []
  )

  useEffect(() => {
    setMobileOpen(false)
    setOpenMenu(null)
    setMenuAnchorRect(null)
    setMenuPos(null)
  }, [pathname, setMobileOpen])

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      if (sidebarRef.current && sidebarRef.current.contains(target)) return
      if (dropdownRef.current && dropdownRef.current.contains(target)) return
      setOpenMenu(null)
      setMenuAnchorRect(null)
      setMenuPos(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reposition dropdown to avoid viewport clipping (flip up/left as needed)
  useEffect(() => {
    if (!openMenu || !menuAnchorRect) return

    const raf = window.requestAnimationFrame(() => {
      const el = dropdownRef.current
      if (!el) return

      const vh = window.innerHeight || 0
      const vw = window.innerWidth || 0
      const margin = 8
      const gap = 10

      const menuRect = el.getBoundingClientRect()
      const desiredLeft = menuAnchorRect.right + gap
      const desiredTop = menuAnchorRect.top

      let left = desiredLeft
      let top = desiredTop

      // Flip left if not enough right space
      if (left + menuRect.width > vw - margin) {
        left = Math.max(margin, menuAnchorRect.left - menuRect.width - gap)
      }

      // Clamp / flip up if not enough bottom space
      if (top + menuRect.height > vh - margin) {
        top = Math.max(margin, vh - menuRect.height - margin)
      }
      if (top < margin) top = margin

      setMenuPos({ top, left })
    })

    return () => window.cancelAnimationFrame(raf)
  }, [openMenu, menuAnchorRect])

  const openDropdownFor = (name, targetEl) => {
    if (!name || !targetEl) return
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    const rect = targetEl.getBoundingClientRect()
    setOpenMenu(name)
    setMenuAnchorRect(rect)
    setMenuPos(null) // will be computed after dropdown renders
  }

  const scheduleClose = () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => {
      if (!menuHoverRef.current) {
        setOpenMenu(null)
        setMenuAnchorRect(null)
        setMenuPos(null)
      }
    }, 120)
  }

  if (!user) return null

  const studioName = user.branchName || 'Dance Studio'
  const sidebarTileClass =
    'flex flex-col justify-center items-center gap-1 rounded-lg text-white w-[104px] min-h-[64px] px-2 py-2 transition-colors'
  const sidebarLabelClass = 'text-center whitespace-nowrap leading-tight w-full overflow-visible'

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Figma node: 748:14611) */}
      <aside
        ref={sidebarRef}
        className={cn(
          'flex flex-col h-screen transition-all duration-300 justify-between items-center',
          'lg:relative fixed inset-y-0 left-0 z-50',
          'w-[136px] min-w-[136px]',
          mobileOpen ? 'flex translate-x-0' : 'hidden lg:flex -translate-x-full lg:translate-x-0',
          'bg-sidebar-gradient rounded-r-[40px]'
        )}
        style={{ padding: '24px 12px' }}
      >
        {/* Welcome section */}
        <div className="flex flex-col items-center gap-5 w-[112px]">
          <div className="flex flex-col justify-center items-center gap-1">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[color:var(--studio-primary)]" aria-hidden>
              <Image
                src="/figma/sidebar/images/logo.png"
                alt=""
                width={32}
                height={32}
                className="w-full h-full object-cover"
                unoptimized
                priority
              />
            </div>
            <div className="text-white font-medium" style={{ fontSize: 14, lineHeight: '20px' }}>
              {studioName}
            </div>
          </div>

          <nav className="flex flex-col items-center gap-1 rounded-r-[24px]">
            {navItems.map((item) => {
              const hasAccess = item.href ? canAccessRoute(item.href) : true
              if (!hasAccess) return null

              const hasChildren = Array.isArray(item.children) && item.children.length > 0
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))

              const labelClass =
                item.labelStyle === 'bold'
                  ? 'text-[12px] leading-[18px] font-bold'
                  : item.labelStyle === 'regular14'
                    ? 'text-[14px] leading-[20px] font-normal'
                    : 'text-[12px] leading-[18px] font-normal'

              return (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => {
                    // handled on the button/link so we can capture the bounding rect
                  }}
                  onMouseLeave={() => {
                    if (hasChildren && !mobileOpen) scheduleClose()
                  }}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        // Parent with submenu should not navigate; open/toggle popup list.
                        e.preventDefault()
                        const anchorEl = e.currentTarget
                        if (mobileOpen) {
                          setOpenMenu((prev) => {
                            const next = prev === item.name ? null : item.name
                            if (next) {
                              setMenuAnchorRect(anchorEl.getBoundingClientRect())
                              setMenuPos(null)
                            } else {
                              setMenuAnchorRect(null)
                              setMenuPos(null)
                            }
                            return next
                          })
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (hasChildren && !mobileOpen) openDropdownFor(item.name, e.currentTarget)
                      }}
                      className={cn(
                        sidebarTileClass,
                        'hover:bg-black/15 dark:hover:bg-white/10',
                        isActive && 'bg-black/20 dark:bg-white/15'
                      )}
                      aria-expanded={openMenu === item.name}
                      aria-haspopup="menu"
                    >
                      <img
                        src={item.iconSrc}
                        alt=""
                        width={item.iconSize}
                        height={item.iconSize}
                        style={{ width: item.iconSize, height: item.iconSize }}
                        aria-hidden
                      />
                      <span className={cn(sidebarLabelClass, labelClass)}>{item.name}</span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      onMouseEnter={() => {
                        // close any open dropdown when hovering non-dropdown items
                        if (!mobileOpen) {
                          setOpenMenu(null)
                          setMenuAnchorRect(null)
                          setMenuPos(null)
                        }
                      }}
                      className={cn(
                        sidebarTileClass,
                        'hover:bg-black/15 dark:hover:bg-white/10',
                        isActive && 'bg-black/20 dark:bg-white/15'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <img
                        src={item.iconSrc}
                        alt=""
                        width={item.iconSize}
                        height={item.iconSize}
                        style={{ width: item.iconSize, height: item.iconSize }}
                        aria-hidden
                      />
                      <span className={cn(sidebarLabelClass, labelClass)}>{item.name}</span>
                    </Link>
                  )}
                </div>
              )
            })}
          </nav>
        </div>

        {/* Subscription section */}
        <div className="relative group flex flex-col items-center gap-1 p-1 rounded-lg border border-white/20 bg-black/15 dark:bg-white/10 w-[112px]">
          <div className="w-[62px] h-[46.5px] overflow-hidden rounded">
            <Image
              src="/figma/sidebar/upcoming-memoji.png"
              alt=""
              width={62}
              height={47}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="text-white font-bold text-[10px] leading-[16px] drop-shadow-sm">Upcoming Tasks</div>

          <div className="pointer-events-none absolute left-[118px] bottom-0 w-[260px] rounded-xl border border-border bg-popover text-popover-foreground p-3 opacity-0 shadow-lg transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 z-50">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upcoming Tasks</div>
            <div className="space-y-2">
              {sidebarUpcomingTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-border px-2.5 py-2">
                  <div className="text-xs font-medium text-foreground leading-4">{task.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Due {taskDateFormatter.format(new Date(task.dueDate))} - {task.assignee}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Fixed-position dropdown so it never clips */}
      {openMenu && (() => {
        const item = menuItemsByName.get(openMenu)
        if (!item || !item.children || item.children.length === 0) return null

        const top = menuPos?.top ?? (menuAnchorRect?.top ?? 0)
        const left = menuPos?.left ?? ((menuAnchorRect?.right ?? 0) + 10)

        return (
          <div
            ref={dropdownRef}
            className="fixed w-[210px] bg-popover text-popover-foreground rounded-xl shadow-lg py-3 z-[9999] border border-border"
            style={{ top, left }}
            role="menu"
            onMouseEnter={() => {
              menuHoverRef.current = true
              if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
            }}
            onMouseLeave={() => {
              menuHoverRef.current = false
              scheduleClose()
            }}
          >
            <div className="px-5 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {item.name}
            </div>
            <div className="h-px bg-border mb-2 mx-2" />
            <div className="flex flex-col">
              {item.children
                .filter((child) => (child.href ? canAccessRoute(child.href) : true))
                .map((child) => {
                  const isChildActive = pathname === child.href
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => {
                        setOpenMenu(null)
                        setMenuAnchorRect(null)
                        setMenuPos(null)
                        setMobileOpen(false)
                      }}
                      className={cn(
                        'px-5 py-2.5 text-sm transition-colors block w-full text-left',
                        isChildActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted hover:text-foreground'
                      )}
                      role="menuitem"
                    >
                      {child.name}
                    </Link>
                  )
                })}
            </div>
          </div>
        )
      })()}

    </>
  )
}
