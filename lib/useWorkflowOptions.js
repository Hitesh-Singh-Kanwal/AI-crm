'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { extractFormTemplatesList, extractLeadReasonsList } from '@/lib/workflow-normalize'

const FORMS_FETCH_LIMIT = 200

export function useWorkflowOptions(enabled = true) {
  const [forms, setForms] = useState([])
  const [reasons, setReasons] = useState([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [reasonsLoading, setReasonsLoading] = useState(false)
  const [optionsError, setOptionsError] = useState('')

  const load = useCallback(async () => {
    if (!enabled) return
    setOptionsError('')
    setFormsLoading(true)
    setReasonsLoading(true)

    const [formsRes, reasonsRes] = await Promise.all([
      api.get(`/api/formBuilder?page=1&limit=${FORMS_FETCH_LIMIT}`),
      api.get('/api/lead-reasons'),
    ])

    if (formsRes?.success) {
      setForms(extractFormTemplatesList(formsRes))
    } else {
      setOptionsError(formsRes?.error || 'Failed to load forms.')
      setForms([])
    }

    if (reasonsRes?.success) {
      setReasons(extractLeadReasonsList(reasonsRes))
    } else {
      setOptionsError((prev) => prev || reasonsRes?.error || 'Failed to load reasons.')
      setReasons([])
    }

    setFormsLoading(false)
    setReasonsLoading(false)
  }, [enabled])

  useEffect(() => {
    load()
  }, [load])

  return { forms, reasons, formsLoading, reasonsLoading, optionsError, reloadOptions: load }
}
