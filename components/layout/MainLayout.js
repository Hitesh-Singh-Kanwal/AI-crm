'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { canAccessRoute, getDefaultRedirect } from '@/lib/permissions'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout({ children, title, subtitle }) {
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
      router.push('/login')
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={<header className="sticky top-0 z-30 min-h-[86px] border-b border-slate-200/80 bg-white" />}>
          <Header 
            title={title} 
            subtitle={subtitle} 
            onMenuClick={() => setMobileMenuOpen(true)} 
          />
        </Suspense>
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide bg-background p-1 md:p-2" key={branchVersion}>
          {children}
        </main>
      </div>
    </div>
  )
}


