'use client'

import ConversationComposer from './ConversationComposer'

export default function MessageInput({ onSendMessage, channel = 'SMS', sending = false }) {
  return (
    <ConversationComposer
      variant={channel === 'Email' ? 'email' : 'sms'}
      onSendMessage={onSendMessage}
      sending={sending}
    />
  )
}
