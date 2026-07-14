'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'
import { getDefaultRedirect } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      router.push(getDefaultRedirect())
    } else {
      setError(result.error || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-gradient p-10 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--studio-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--studio-primary)]/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 rounded-xl bg-[var(--studio-primary)] flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8C18.5 8 17 9 17 11V15C17 16 17.5 17 18.5 17.5L20 18.5L21.5 17.5C22.5 17 23 16 23 15V11C23 9 21.5 8 20 8Z" fill="white" opacity="0.9"/>
                <path d="M13 14C11.5 14 10 15 10 17V25C10 27 11.5 28 13 28C14.5 28 16 27 16 25V17C16 15 14.5 14 13 14Z" fill="white" opacity="0.7"/>
                <path d="M27 14C25.5 14 24 15 24 17V25C24 27 25.5 28 27 28C28.5 28 30 27 30 25V17C30 15 28.5 14 27 14Z" fill="white" opacity="0.7"/>
              </svg>
            </div>
            <span className="text-white text-2xl font-display font-semibold">Dance Academy</span>
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl xl:text-5xl font-display text-white leading-tight">
              Welcome back to your
              <br />
              <span className="text-white/80">Studio Control Center</span>
            </h1>
            <p className="text-white/75 text-base max-w-lg font-body">
              Continue managing leads, conversations, campaigns, and AI-powered follow-ups from one unified CRM dashboard.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid gap-3 max-w-md">
          <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
            <p className="text-white/90 font-medium text-sm font-body">Smart Lead Routing</p>
            <p className="text-white/70 text-sm font-body">Automatically route conversations to the right inbox and agent.</p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4">
            <p className="text-white/90 font-medium text-sm font-body">AI + Human Handoff</p>
            <p className="text-white/70 text-sm font-body">Handle escalations smoothly with AI assistants and live staff.</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center py-10 px-4 sm:px-6 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-[var(--studio-primary)] flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8C18.5 8 17 9 17 11V15C17 16 17.5 17 18.5 17.5L20 18.5L21.5 17.5C22.5 17 23 16 23 15V11C23 9 21.5 8 20 8Z" fill="white" opacity="0.9"/>
                <path d="M13 14C11.5 14 10 15 10 17V25C10 27 11.5 28 13 28C14.5 28 16 27 16 25V17C16 15 14.5 14 13 14Z" fill="white" opacity="0.7"/>
                <path d="M27 14C25.5 14 24 15 24 17V25C24 27 25.5 28 27 28C28.5 28 30 27 30 25V17C30 15 28.5 14 27 14Z" fill="white" opacity="0.7"/>
              </svg>
            </div>
            <span className="text-foreground text-2xl font-display font-semibold">Dance Academy</span>
          </div>

          <div className="border border-border rounded-2xl bg-card/80 backdrop-blur-sm shadow-sm p-5 sm:p-7">
            <div className="text-center mb-6">
              <div className="mx-auto h-10 w-10 rounded-lg bg-[var(--studio-primary)] flex items-center justify-center mb-3">
                <span className="text-white font-medium">DA</span>
              </div>
              <h2 className="text-2xl font-semibold text-foreground">Sign in to your account</h2>
              <p className="text-sm text-muted-foreground mt-1">Access your CRM workspace and continue where you left off.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm text-foreground block mb-1.5 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)]"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm text-foreground block mb-1.5 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)]"
                />
              </div>

              <div className="text-right mt-2">
                <a href="/auth/forgot-password" className="text-sm text-[var(--studio-primary)] hover:underline font-medium">
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-[var(--studio-primary)] hover:brightness-95 text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Don&apos;t have an account?{' '}
                <a href="/auth/register" className="text-[var(--studio-primary)] font-semibold hover:underline">
                  Create one
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


