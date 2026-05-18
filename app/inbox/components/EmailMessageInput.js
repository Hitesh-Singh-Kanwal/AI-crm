'use client'

import ConversationComposer from './ConversationComposer'

export default function EmailMessageInput({
  onSendMessage,
  disabled = false,
  sending = false,
}) {
  return (
    <ConversationComposer
      variant="email"
      onSendMessage={onSendMessage}
      disabled={disabled}
      sending={sending}
    />
  )
}
