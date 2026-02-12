'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
      // Redirect based on role
      if (result.user.role === 'staff') {
        router.push('/inbox')
      } else {
        router.push('/')
      }
    } else {
      setError(result.error || 'Login failed')
    }

    setLoading(false)
  }

  return (
    <div className="h-screen flex">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 flex-col justify-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 8C18.5 8 17 9 17 11V15C17 16 17.5 17 18.5 17.5L20 18.5L21.5 17.5C22.5 17 23 16 23 15V11C23 9 21.5 8 20 8Z" fill="white" opacity="0.9"/>
              <path d="M13 14C11.5 14 10 15 10 17V25C10 27 11.5 28 13 28C14.5 28 16 27 16 25V17C16 15 14.5 14 13 14Z" fill="white" opacity="0.7"/>
              <path d="M27 14C25.5 14 24 15 24 17V25C24 27 25.5 28 27 28C28.5 28 30 27 30 25V17C30 15 28.5 14 27 14Z" fill="white" opacity="0.7"/>
            </svg>
          </div>
          <span className="text-white text-2xl font-display font-semibold">Dance Academy</span>
        </div>

        <div>
          <h1 className="text-4xl font-display text-white leading-tight mb-2">Professional Dance<br /><span className="text-teal-400">Management System</span></h1>
          <p className="text-slate-300 text-base max-w-md">Transform your dance academy with our comprehensive CRM solution. Manage students, classes, payments, and more.</p>
        </div>
      </div>

      {/* Right form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white py-12 px-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto h-10 w-10 rounded-lg bg-brand flex items-center justify-center mb-3">
              <span className="text-white font-medium">DA</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Dance Academy CRM</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm text-slate-700 block mb-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-slate-700 block mb-1">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10" variant="gradient" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              Don't have an account?{' '}
              <a href="/register" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline">
                Create one
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


