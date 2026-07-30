'use client'

import { createContext, useContext } from 'react'

const ReportTimezoneContext = createContext('America/New_York')

export function ReportTimezoneProvider({ timeZone, children }) {
  return (
    <ReportTimezoneContext.Provider value={timeZone || 'America/New_York'}>
      {children}
    </ReportTimezoneContext.Provider>
  )
}

export function useReportTimezone() {
  return useContext(ReportTimezoneContext)
}
