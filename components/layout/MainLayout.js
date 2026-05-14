'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { canAccessRoute, getDefaultRedirect } from '@/lib/permissions'
import Sidebar from './Sidebar'
import Header from './Header'
import { cn } from '@/lib/utils'

export default function MainLayout({ children, title, subtitle, mainClassName }) {
  const router = useRouter()
  const pathname = usePathname()
  const [branchVersion, setBranchVersion] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isAuth, setIsAuth] = useState(false)

  // Only check authentication on client side to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true)
    const authenticated = isAuthenticated()
    setIsAuth(authenticated)

    if (!authenticated) {
      router.push('/auth/login')
      return
    }

    // Check route access
    if (!canAccessRoute(pathname)) {
      router.push(getDefaultRedirect())
    }
  }, [pathname, router])

  useEffect(() => {
    const handleBranchChange = () => {
      setBranchVersion((prev) => prev + 1)
    }

    window.addEventListener('branch-change', handleBranchChange)
    return () => window.removeEventListener('branch-change', handleBranchChange)
  }, [])

  // Show nothing until client-side hydration is complete
  if (!isClient || !isAuth) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex-1 flex flex-col overflow-hidden md:p-2">
        <Suspense fallback={<header className="sticky top-0 z-30 min-h-[86px] border-b border-border bg-background" />}>
          <Header 
            title={title} 
            subtitle={subtitle} 
            mobileMenuOpen={mobileMenuOpen}
            onMenuClick={() => setMobileMenuOpen((prev) => !prev)} 
          />
        </Suspense>
        <main
          className={cn(
            'flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-background px-3 py-3 sm:px-4 sm:py-4 lg:px-2',
            mainClassName,
          )}
          key={branchVersion}
        >
          {children}
        </main>
      </div>
    </div>
  )
}


