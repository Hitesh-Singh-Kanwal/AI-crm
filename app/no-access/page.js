'use client'

import { useEffect, useState } from 'react'
import { ShieldOff, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCurrentUser, logout } from '@/lib/auth'

/**
 * Terminal landing page for a session with no reachable route.
 *
 * getDefaultRedirect walks a list of candidate landing pages and falls through
 * to here when every one of them fails its own permission check. Redirecting
 * anywhere else would bounce the user straight back — that's the infinite loop
 * this page exists to end.
 */
export default function NoAccessPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <ShieldOff className="h-6 w-6 text-muted-foreground" />
        </div>

        <h1 className="mt-5 text-lg font-semibold text-foreground">
          No pages available
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {user?.role ? (
            <>
              The <span className="font-medium text-foreground">{user.role}</span> role
              doesn&apos;t have permission to view any page yet.
            </>
          ) : (
            <>Your role doesn&apos;t have permission to view any page yet.</>
          )}{' '}
          Ask an administrator to grant it access under Settings → Users &amp; Roles.
        </p>

        {user?.email && (
          <p className="mt-4 text-xs text-muted-foreground/80">
            Signed in as {user.email}
          </p>
        )}

        <Button variant="outline" className="mt-6 w-full" onClick={() => logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
