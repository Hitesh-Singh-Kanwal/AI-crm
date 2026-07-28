'use client'

import { createContext, useContext, useState } from 'react'

const InboxHeaderContext = createContext({
  inboxCounts: { customers: 0, leads: 0, teachers: 0 },
  setInboxCounts: () => {},
  // legacy alias kept so older callers don't crash
  inboxTeachersCount: 0,
  setInboxTeachersCount: () => {},
})

export function InboxHeaderProvider({ children }) {
  const [inboxCounts, setInboxCounts] = useState({
    customers: 0,
    leads: 0,
    teachers: 0,
  })

  const setInboxTeachersCount = (n) => {
    setInboxCounts((prev) => ({ ...prev, teachers: Number(n) || 0 }))
  }

  return (
    <InboxHeaderContext.Provider
      value={{
        inboxCounts,
        setInboxCounts,
        inboxTeachersCount: inboxCounts.teachers,
        setInboxTeachersCount,
      }}
    >
      {children}
    </InboxHeaderContext.Provider>
  )
}

export function useInboxHeader() {
  return useContext(InboxHeaderContext)
}
