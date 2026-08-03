'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PhoneInput from 'react-phone-input-2'
import { registerOrganization } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import GlobalLoader from '@/components/shared/GlobalLoader'
import { BrandLockup } from '@/components/shared/BrandLogo'
import 'react-phone-input-2/lib/style.css'

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

  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const userErr = validateUserStep()
    if (userErr) {
      setError(userErr)
      return
    }

    setLoading(true)

    const organisationInfo = {
      name: orgName,
      address,
      city,
      state: stateVal,
      country,
      email: orgEmail,
      phone: orgPhone,
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
      setTimeout(() => router.push('/auth/login'), 1200)
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
    return null
  }

  // These credentials become the sign-in for this account, so a typo in either
  // password field would create an account nobody can log into.
  const validateUserStep = () => {
    if (!userName.trim()) return 'First name is required'
    if (!userEmail.trim()) return 'Email address is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password !== confirmPassword) return 'Passwords do not match'
    return null
  }

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

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

        .register-phone-input .form-control {
          width: 100% !important;
          height: 40px !important;
          border: 1px solid hsl(var(--border)) !important;
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border-radius: 0.5rem !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 0.875rem !important;
          padding-left: 50px !important;
        }

        .register-phone-input .form-control:focus {
          border-color: var(--studio-primary) !important;
          box-shadow: 0 0 0 1px var(--studio-primary) !important;
        }

        .register-phone-input .flag-dropdown {
          border: 1px solid hsl(var(--border)) !important;
          border-right: none !important;
          background: hsl(var(--background)) !important;
          border-radius: 0.5rem 0 0 0.5rem !important;
        }

        .register-phone-input .selected-flag:hover,
        .register-phone-input .selected-flag:focus {
          background: hsl(var(--muted)) !important;
        }

        .register-phone-input .country-list {
          background: hsl(var(--popover)) !important;
          color: hsl(var(--foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
        }

        .register-phone-input .country-list .country:hover,
        .register-phone-input .country-list .country.highlight {
          background: hsl(var(--muted)) !important;
        }
      `}</style>

      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar-gradient p-8 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--studio-primary)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--studio-primary)]/10 rounded-full blur-3xl" />
        
        <div className="relative z-10">
          <div className="mb-12">
            <BrandLockup size={64} className="items-start text-left" />
          </div>

          <div className="space-y-6 mt-12">
            <h1 className="text-4xl font-display text-white leading-tight">
              Professional Dance<br />
              <span className="text-white/80">Management System</span>
            </h1>
            <p className="text-white/70 text-base max-w-md font-body">
              Transform your dance academy with our comprehensive CRM solution. Manage students, classes, payments, and more.
            </p>

            <div className="space-y-6 mt-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-body mb-1">Student Management</h3>
                  <p className="text-white/70 text-sm font-body">Track student progress, attendance, and performance</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-body mb-1">Class Scheduling</h3>
                  <p className="text-white/70 text-sm font-body">Effortlessly manage class schedules and bookings</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold font-body mb-1">Analytics & Reports</h3>
                  <p className="text-white/70 text-sm font-body">Get insights with powerful analytics and reporting</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm font-body">© 2026 CADANCE AI. All rights reserved.</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center py-6 px-4 bg-background">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <BrandLockup size={64} tone="default" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-display text-foreground mb-2">Create your account</h2>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-body transition-all ${step === 1 ? 'bg-[var(--studio-primary)] text-white ring-4 ring-[var(--studio-primary-light)]' : 'bg-[var(--studio-primary)] text-white'}`}>
                1
              </div>
              <div className="w-16 h-0.5 bg-border">
                <div className={`h-full bg-[var(--studio-primary)] transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold font-body transition-all ${step === 2 ? 'bg-[var(--studio-primary)] text-white ring-4 ring-[var(--studio-primary-light)]' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
            </div>
            <span className="text-sm text-muted-foreground font-body">Step {step} of 2</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-slide-in">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="orgName" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                      Organization Name <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="orgName" 
                      value={orgName} 
                      onChange={(e) => setOrgName(e.target.value)}
                      className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                      placeholder="e.g., Elite Dance Academy"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="orgEmail" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        Organization Email <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="orgEmail" 
                        type="email" 
                        value={orgEmail} 
                        onChange={(e) => setOrgEmail(e.target.value)}
                        className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                        placeholder="contact@academy.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orgPhone" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        Phone Number <span className="text-destructive">*</span>
                      </Label>
                      <PhoneInput
                        country="us"
                        enableSearch
                        countryCodeEditable={false}
                        id="orgPhone" 
                        value={orgPhone} 
                        onChange={(value) => setOrgPhone(value)}
                        inputClass="font-body"
                        containerClass="register-phone-input"
                        searchClass="font-body"
                        placeholder="Enter organization phone"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                      Street Address <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                      placeholder="123 Dance Street"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        City
                      </Label>
                      <Input 
                        id="city" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)}
                        className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        State
                      </Label>
                      <Input 
                        id="state" 
                        value={stateVal} 
                        onChange={(e) => setStateVal(e.target.value)}
                        className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <Label htmlFor="country" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        Country
                      </Label>
                      <Input 
                        id="country" 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                        placeholder="USA"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={handleNext}
                  className="w-full bg-[var(--studio-primary)] hover:brightness-95 text-white h-10 font-medium font-body rounded-lg transition-all"
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
                      <Label htmlFor="userName" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="userName" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)} 
                        required
                      className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                        placeholder="John"
                      />
                    </div>

                    <div>
                      <Label htmlFor="userPhone" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        Mobile Number
                      </Label>
                      <PhoneInput
                        country="us"
                        enableSearch
                        countryCodeEditable={false}
                        id="userPhone" 
                        value={userPhone} 
                        onChange={(value) => setUserPhone(value)}
                        inputClass="font-body"
                        containerClass="register-phone-input"
                        searchClass="font-body"
                        placeholder="Enter mobile number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="userEmail" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                      Email address <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="userEmail" 
                      type="email" 
                      value={userEmail} 
                      onChange={(e) => setUserEmail(e.target.value)} 
                      required
                      className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                      placeholder="name@company.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required
                        className="h-10 border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)] font-body"
                        placeholder="Min 8 characters"
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-foreground font-medium font-body text-sm mb-1.5 block">
                        Confirm Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        aria-invalid={passwordsMismatch}
                        aria-describedby={passwordsMismatch ? 'confirmPassword-error' : undefined}
                        className={cn(
                          'h-10 font-body',
                          passwordsMismatch
                            ? 'border-destructive focus:border-destructive focus:ring-destructive'
                            : 'border-border focus:border-[var(--studio-primary)] focus:ring-[var(--studio-primary)]',
                        )}
                        placeholder="Confirm password"
                      />
                      {passwordsMismatch && (
                        <p id="confirmPassword-error" className="mt-1.5 text-xs text-destructive font-body">
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-10 font-medium font-body border-border text-foreground hover:bg-muted/40"
                  >
                    <svg className="mr-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-[var(--studio-primary)] hover:brightness-95 text-white h-10 font-medium font-body disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <GlobalLoader variant="inline" size="sm" className="-ml-1 mr-2" />
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
              <div className="p-3.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-start font-body">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 text-sm text-success bg-success/10 border border-success/20 rounded-lg flex items-start font-body">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground text-sm font-body">
              Already have an account?{' '}
              <a href="/auth/login" className="text-[var(--studio-primary)] font-semibold hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}