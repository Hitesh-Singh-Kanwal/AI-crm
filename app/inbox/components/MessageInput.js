import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('')
  const [channel] = useState('Email')

  const handleSend = () => {
    if (!message.trim()) return

    onSendMessage?.({ content: message, channel })
    setMessage('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="p-3 sm:p-4 bg-white">
      <div className="relative">
        <Textarea
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="min-h-[64px] sm:min-h-[80px] resize-none pr-6 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[color:var(--studio-primary)] text-sm"
        />

        {/* small action icons removed per design */}

        {/* (channel selector removed — only Send button remains) */}

        {/* Single Send button positioned bottom-right overlapping the input (matches Figma) */}
        <button
          onClick={handleSend}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm"
          style={{
            background: 'var(--studio-gradient-css)',
            border: '1px solid rgba(0,0,0,0.04)',
            position: 'absolute',
            right: 12,
            bottom: 8,
            height: 36,
            minWidth: 72,
          }}
        >
          <Send className="h-4 w-4" />
          <span>Send</span>
        </button>
      </div>

      {/* no channel selector — single Send button only */}
    </div>
  )
}
