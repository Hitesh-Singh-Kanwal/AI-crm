'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  Users,
  UserPlus,
  Shield,
  Calendar,
  BarChart3,
  FileText,
  Mail,
  MessageSquare,
  Workflow,
  Phone,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentUser, logout } from '@/lib/auth'
import { canAccessRoute } from '@/lib/permissions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, badge: null },
  { name: 'Inbox', href: '/inbox', icon: Inbox, badge: '5' },
  { name: 'Users', href: '/users', icon: Users, badge: null },
  { name: 'Roles', href: '/roles', icon: Shield, badge: null },
  { name: 'Leads', href: '/leads', icon: UserPlus, badge: null },
  { name: 'Calendar', href: '/calendar', icon: Calendar, badge: null },
  { name: 'Reports', href: '/reports', icon: BarChart3, badge: null },
]

const marketingItems = [
  { name: 'Form Builder', href: '/forms', icon: FileText, badge: null },
  { name: 'Email Builder', href: '/emails', icon: Mail, badge: null },
  { name: 'SMS', href: '/sms', icon: MessageSquare, badge: null },
]

const automationItems = [
  { name: 'Workflows', href: '/workflows', icon: Workflow, badge: null },
]

const aiItems = [
  { name: 'AI Calling', href: '/ai-calling', icon: Phone, badge: null },
]

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const user = getCurrentUser()

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  // Prevent body scroll when mobile menu is open
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

  const NavLink = ({ item }) => {
    if (!canAccessRoute(item.href)) return null

    const isActive = pathname === item.href
    const Icon = item.icon

    return (
      <Link
        href={item.href}
        title={collapsed ? item.name : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-brand text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <Badge 
                variant={isActive ? 'default' : 'info'} 
                className={cn('ml-auto', isActive && 'bg-white/20 text-white border-white/30')}
              >
                {item.badge}
              </Badge>
            )}
          </>
        )}
      </Link>
    )
  }

  const NavSection = ({ title, items }) => {
    const accessibleItems = items.filter((item) => canAccessRoute(item.href))
    if (accessibleItems.length === 0) return null

    return (
      <div className="space-y-1">
        {!collapsed && (
          <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {title}
          </h3>
        )}
        {accessibleItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 shadow-sm',
          // Desktop
          'md:flex',
          collapsed ? 'md:w-16' : 'md:w-64',
          // Mobile
          'md:relative fixed inset-y-0 left-0 z-50',
          mobileOpen ? 'flex translate-x-0' : 'hidden md:flex -translate-x-full md:translate-x-0',
          'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">DA</span>
              </div>
              <div>
                <span className="font-semibold text-base text-slate-900">Dance CRM</span>
                <p className="text-xs text-slate-500">Multi-Branch</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center shadow-sm mx-auto">
              <span className="text-white font-bold text-xs">DA</span>
            </div>
          )}
          {/* Close button for mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Collapse button for desktop */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:block p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 space-y-6 px-2">
        <NavSection title="Main" items={navigationItems} />
        <NavSection title="Marketing" items={marketingItems} />
        <NavSection title="Automation" items={automationItems} />
        <NavSection title="AI Features" items={aiItems} />
      </div>

      {/* User Profile */}
      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
            <AvatarFallback className="bg-brand text-white font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.role}</p>
              {user.branchName && (
                <p className="text-xs text-slate-400 truncate">{user.branchName}</p>
              )}
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={logout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors text-slate-600 border border-slate-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </button>
        )}
      </div>
    </div>
    </>
  )
}


