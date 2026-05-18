'use client'

import ConversationComposer from './ConversationComposer'

export default function MessageInput({ onSendMessage, channel = 'SMS' }) {
  return (
    <ConversationComposer
      variant={channel === 'Email' ? 'email' : 'sms'}
      onSendMessage={onSendMessage}
    />
  )
}
