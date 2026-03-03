'use client'

import { createContext, useContext, useState } from 'react'

const InboxHeaderContext = createContext({
  inboxTeachersCount: 0,
  setInboxTeachersCount: () => {},
})

export function InboxHeaderProvider({ children }) {
  const [inboxTeachersCount, setInboxTeachersCount] = useState(0)
  return (
    <InboxHeaderContext.Provider value={{ inboxTeachersCount, setInboxTeachersCount }}>
      {children}
    </InboxHeaderContext.Provider>
  )
}

export function useInboxHeader() {
  return useContext(InboxHeaderContext)
}
