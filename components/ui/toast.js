'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

let idSeed = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${idSeed++}`
    const next = { id, ...toast }
    setToasts((t) => [next, ...t])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onClose }) {
  const { id, type = 'info', title, message } = toast

  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4500)
    return () => clearTimeout(timer)
  }, [id, onClose])

  const color =
    type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800'

  return (
    <div className={`${color} text-white rounded-lg shadow-md p-3 w-80 flex items-start justify-between`}>
      <div className="flex-1">
        {title && <div className="font-semibold text-sm">{title}</div>}
        {message && <div className="text-xs opacity-90 mt-1">{message}</div>}
      </div>
      <button onClick={onClose} className="ml-3 text-white opacity-80 hover:opacity-100">
        ✕
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')

  const { addToast } = ctx
  return {
    success: (payload) => addToast({ type: 'success', ...payload }),
    error: (payload) => addToast({ type: 'error', ...payload }),
    info: (payload) => addToast({ type: 'info', ...payload }),
  }
}

