'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerOrganization } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [orgName, setOrgName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [stateVal, setStateVal] = useState('')
  const [country, setCountry] = useState('')
  const [orgEmail, setOrgEmail] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [logo, setLogo] = useState('')
  const [establishedDate, setEstablishedDate] = useState('')

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const organisationInfo = {
      name: orgName,
      address,
      city,
      state: stateVal,
      country,
      email: orgEmail,
      phone: orgPhone,
      logo,
      establishedDate,
    }

    const userInfo = {
      name: userName,
      email: userEmail,
      phoneNumber: userPhone,
      password,
    }

    const result = await registerOrganization(organisationInfo, userInfo)

    if (result.success) {
      setSuccessMessage(result.message || 'Registered successfully. Please sign in.')
      setTimeout(() => router.push('/login'), 1200)
    } else {
      setError(result.error || 'Registration failed')
    }

    setLoading(false)
  }

  const validateOrgStep = () => {
    if (!orgName.trim()) return 'Organization name is required'
    if (!orgEmail.trim()) return 'Organization email is required'
    if (!address.trim()) return 'Organization address is required'
    if (!orgPhone.trim()) return 'Organization phone is required'
    if (!establishedDate) return 'Established date is required'
    return null
  }

  const handleNext = () => {
    const err = validateOrgStep()
    if (err) {
      setError(err)
      return
    }
    setError('')
    setStep(2)
  }

  const handleBack = () => {
    setError('')
    setStep(1)
  }

  return (
    <div className="h-screen flex">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap');
        
        .font-display {
          font-family: 'DM Serif Display', serif;
        }
        
        .font-body {
          font-family: 'Inter', sans-serif;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slide-in {
          animation: slideIn 0.4s ease-out;
        }
      `}</style>

      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8C18.5 8 17 9 17 11V15C17 16 17.5 17 18.5 17.5L20 18.5L21.5 17.5C22.5 17 23 16 23 15V11C23 9 21.5 8 20 8Z" fill="white" opacity="0.9"/>
                <path d="M13 14C11.5 14 10 15 10 17V25C10 27 11.5 28 13 28C14.5 28 16 27 16 25V17C16 15 14.5 14 13 14Z" fill="white" opacity="0.7"/>
                <path d="M27 14C25.5 14 24 15 24 17V25C24 27 25.5 28 27 28C28.5 28 30 27 30 25V17C30 15 28.5 14 27 14Z" fill="white" opacity="0.7"/>
                <path d="M20 22L18 28H22L20 22Z" fill="white"/>
                <circle cx="20" cy="32" r="2" fill="white"/>
              </svg>
            </div>
            <span className="text-white text-2xl font-display font-semibold">Dance Academy</span>
          </div>

          <div className="space-y-6 mt-12">
            <h1 className="text-4xl font-display text-white leading-tight">
              Professional Dance<br />
              <span className="text-teal-400">Management System</span>
            </h1>
            <p className="text-slate-300 text-base max-w-md font-body">
              Transform your dance academy with our comprehensive CRM solution. Manage students, classes, payments, and more.
            </p>

            <div className="space-y-6 mt-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-body mb-1">Student Management</h3>
                  <p className="text-slate-400 text-sm font-body">Track student progress, attendance, and performance</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-body mb-1">Class Scheduling</h3>
                  <p className="text-slate-400 text-sm font-body">Effortlessly manage class schedules and bookings</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-body mb-1">Analytics & Reports</h3>
                  <p className="text-slate-400 text-sm font-body">Get insights with powerful analytics and reporting</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-body">© 2026 Dance Academy CRM. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center py-6 px-4 bg-white">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 8C18.5 8 17 9 17 11V15C17 16 17.5 17 18.5 17.5L20 18.5L21.5 17.5C22.5 17 23 16 23 15V11C23 9 21.5 8 20 8Z" fill="white" opacity="0.9"/>
                <path d="M13 14C11.5 14 10 15 10 17V25C10 27 11.5 28 13 28C14.5 28 16 27 16 25V17C16 15 14.5 14 13 14Z" fill="white" opacity="0.7"/>
                <path d="M27 14C25.5 14 24 15 24 17V25C24 27 25.5 28 27 28C28.5 28 30 27 30 25V17C30 15 28.5 14 27 14Z" fill="white" opacity="0.7"/>
              </svg>
            </div>
            <span className="text-slate-900 text-2xl font-display font-semibold">Dance Academy</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-display text-slate-900 mb-2">Create your account</h2>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-body transition-all ${step === 1 ? 'bg-teal-500 text-white ring-4 ring-teal-100' : 'bg-teal-500 text-white'}`}>
                1
              </div>
              <div className="w-16 h-0.5 bg-slate-200">
                <div className={`h-full bg-teal-500 transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-body transition-all ${step === 2 ? 'bg-teal-500 text-white ring-4 ring-teal-100' : 'bg-slate-200 text-slate-500'}`}>
                2
              </div>
            </div>
            <span className="text-sm text-slate-500 font-body">Step {step} of 2</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-slide-in">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="orgName" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                      Organization Name <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="orgName" 
                      value={orgName} 
                      onChange={(e) => setOrgName(e.target.value)}
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                      placeholder="e.g., Elite Dance Academy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orgEmail" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Organization Email <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="orgEmail" 
                        type="email" 
                        value={orgEmail} 
                        onChange={(e) => setOrgEmail(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="contact@academy.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orgPhone" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="orgPhone" 
                        value={orgPhone} 
                        onChange={(e) => setOrgPhone(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="establishedDate" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Established Date <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="establishedDate" 
                        type="date" 
                        value={establishedDate} 
                        onChange={(e) => setEstablishedDate(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                      />
                    </div>

                    <div>
                      <Label htmlFor="logo" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Logo URL <span className="text-slate-400">(Optional)</span>
                      </Label>
                      <Input 
                        id="logo" 
                        value={logo} 
                        onChange={(e) => setLogo(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                      Street Address <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                      placeholder="123 Dance Street"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        City
                      </Label>
                      <Input 
                        id="city" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        State
                      </Label>
                      <Input 
                        id="state" 
                        value={stateVal} 
                        onChange={(e) => setStateVal(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <Label htmlFor="country" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Country
                      </Label>
                      <Input 
                        id="country" 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="USA"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white h-10 font-medium font-body rounded-lg transition-all"
                >
                  Continue
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-slide-in">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userName" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="userName" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)} 
                        required
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="John"
                      />
                    </div>

                    <div>
                      <Label htmlFor="userPhone" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Last Name
                      </Label>
                      <Input 
                        id="userPhone" 
                        value={userPhone} 
                        onChange={(e) => setUserPhone(e.target.value)}
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="userEmail" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                      Email address <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      id="userEmail" 
                      type="email" 
                      value={userEmail} 
                      onChange={(e) => setUserEmail(e.target.value)} 
                      required
                      className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                      placeholder="name@company.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="Min 8 characters"
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-slate-700 font-medium font-body text-sm mb-1.5 block">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        className="h-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500 font-body"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-10 font-medium font-body border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-teal-500 hover:bg-teal-600 text-white h-10 font-medium font-body disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create account
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start font-body">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-start font-body">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-sm font-body">
              Already have an account?{' '}
              <a href="/login" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}