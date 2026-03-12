'use client'

<<<<<<< HEAD
import { useState, Suspense } from 'react'
=======
import { Suspense, useState } from 'react'
>>>>>>> frontend
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { MessageSquare, Plus, Sparkles, Send } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { smsTemplates } from '@/data/dummyData'

const variables = [
  { name: '{{name}}', description: 'Contact name' },
  { name: '{{date}}', description: 'Current date' },
  { name: '{{time}}', description: 'Current time' },
  { name: '{{class}}', description: 'Class name' },
  { name: '{{location}}', description: 'Branch location' },
]

const templateMessages = {
  s1: 'Reminder: {{class}} starts today at {{time}}. Reply if you need help.',
  s2: 'Confirmed! Your appointment is on {{date}} at {{time}} at {{location}}.',
  s3: 'Thank you {{name}}! Your payment has been received.',
  s4: 'Hi {{name}}! Want to try a free class? Reply YES to reserve your spot.',
}

function SMSPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('view') || 'templates'
  const [message, setMessage] = useState('Hi {{name}}, this is a reminder for your {{class}} class today at {{time}}.')
  const [category, setCategory] = useState('Reminders')
  const [senderId, setSenderId] = useState('DanceAcad')

  const characterCount = message.length
  const smsCount = Math.ceil(characterCount / 160)

  const insertVariable = (variable) => {
    setMessage(message + ' ' + variable)
  }

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('view', tab)
    router.push(`${pathname}?${params.toString()}`)
  }

  const applyTemplate = (templateId, templateCategory) => {
    const content = templateMessages[templateId]
    if (!content) return
    setMessage(content)
    setCategory(templateCategory)
    setActiveTab('creator')
  }

  return (
    <MainLayout title="SMS Campaigns" subtitle="Create and send SMS messages">
      {/* Templates View */}
      {activeTab === 'templates' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Browse SMS templates</p>
            <Button variant="gradient" onClick={() => setActiveTab('creator')} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create New Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {smsTemplates.map((template, index) => (
              <Card
                key={template.id}
                className="hover:shadow-lg transition-all cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <MessageSquare className="h-8 w-8 text-primary" />
                    <Badge variant={template.status === 'Active' ? 'success' : 'warning'}>
                      {template.status}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4">{template.name}</CardTitle>
                  <Badge variant="outline" className="mt-2 w-fit">
                    {template.category}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sent:</span>
                      <span className="font-medium">{template.sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivered:</span>
                      <span className="font-medium">{template.delivered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responses:</span>
                      <span className="font-medium">{template.responses}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="flex-1"
                      onClick={() => applyTemplate(template.id, template.category)}
                    >
                      Use Template
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Creator View */}
      {activeTab === 'creator' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {/* Variables Panel */}
            <div className="md:col-span-4 lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Variables</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                    {variables.map((variable) => (
                      <button
                        key={variable.name}
                        onClick={() => insertVariable(variable.name)}
                        className="w-full text-left p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <p className="text-xs sm:text-sm font-mono font-medium">{variable.name}</p>
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4 text-xs sm:text-sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Generate
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* SMS Editor */}
            <div className="md:col-span-8 lg:col-span-5">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Message Editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Message Content</Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      placeholder="Type your SMS message..."
                      maxLength={480}
                    />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {characterCount}/480 characters
                      </span>
                      <Badge variant={smsCount > 1 ? 'warning' : 'info'}>
                        {smsCount} SMS {smsCount > 1 && 'messages'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Messages over 160 characters will be split into multiple SMS
                    </p>
                  </div>

                  <div className="p-4 bg-brand/10 border border-brand-light rounded-lg text-sm">
                    <p className="font-medium text-brand-dark mb-2">Preview:</p>
                    <p className="text-brand-dark">
                      {message.replace('{{name}}', 'John Doe')
                        .replace('{{date}}', 'Feb 5, 2024')
                        .replace('{{time}}', '3:00 PM')
                        .replace('{{class}}', 'Ballet')
                        .replace('{{location}}', 'Stamford')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Phone Preview & Settings */}
            <div className="md:col-span-12 lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Phone Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Phone Mockup */}
                  <div className="mx-auto w-full max-w-64 h-[400px] sm:h-[480px] border-4 sm:border-8 border-gray-800 rounded-[2rem] sm:rounded-[2.5rem] bg-white shadow-xl overflow-hidden">
                    <div className="h-6 bg-gray-800" />
                    <div className="p-4 h-full bg-gray-50">
                      <div className="bg-white rounded-2xl p-3 shadow-sm max-w-[85%]">
                        <p className="text-xs text-gray-500 mb-1">{senderId}</p>
                        <p className="text-sm">
                          {message.replace('{{name}}', 'John')
                            .replace('{{date}}', 'Feb 5')
                            .replace('{{time}}', '3:00 PM')
                            .replace('{{class}}', 'Ballet')
                            .replace('{{location}}', 'Stamford')}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Just now</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm">Template Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input placeholder="e.g., Class Reminder" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="Reminders">Reminders</option>
                      <option value="Confirmations">Confirmations</option>
                      <option value="Notifications">Notifications</option>
                      <option value="Marketing">Marketing</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sender ID</Label>
                    <Input
                      value={senderId}
                      onChange={(e) => setSenderId(e.target.value)}
                      placeholder="DanceAcad"
                      maxLength={11}
                    />
                    <p className="text-xs text-muted-foreground">
                      Max 11 characters, no spaces
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                    </Select>
                  </div>
                  <Button variant="gradient" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Save & Send
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeTab === 'analytics' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <h3 className="text-3xl font-bold mt-2">4,036</h3>
                  <p className="text-xs text-green-600 mt-2">+12.5% vs last month</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <h3 className="text-3xl font-bold mt-2">3,966</h3>
                  <p className="text-xs text-muted-foreground mt-2">98.3% delivery rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <h3 className="text-3xl font-bold mt-2">70</h3>
                  <p className="text-xs text-muted-foreground mt-2">1.7% failure rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Responses</p>
                  <h3 className="text-3xl font-bold mt-2">402</h3>
                  <p className="text-xs text-muted-foreground mt-2">10.1% response rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Template */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Performance by Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {smsTemplates.map((template) => {
                  const deliveryRate = ((template.delivered / template.sent) * 100).toFixed(1)
                  const responseRate = ((template.responses / template.sent) * 100).toFixed(1)

                  return (
                    <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.category}</p>
                      </div>
                      <div className="flex gap-8 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Sent</p>
                          <p className="font-bold">{template.sent}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Delivery</p>
                          <p className="font-bold text-green-600">{deliveryRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Response</p>
                          <p className="font-bold text-slate-600">{responseRate}%</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  )
}

export default function SMSPage() {
  return (
<<<<<<< HEAD
    <Suspense fallback={null}>
=======
    <Suspense
      fallback={
        <MainLayout title="SMS Campaigns" subtitle="Create and send SMS messages">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
          </div>
        </MainLayout>
      }
    >
>>>>>>> frontend
      <SMSPageInner />
    </Suspense>
  )
}

