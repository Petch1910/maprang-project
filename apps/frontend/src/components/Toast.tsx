import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

const toastStore: {
  toasts: Toast[]
  listeners: Set<(toasts: Toast[]) => void>
  add: (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
} = {
  toasts: [],
  listeners: new Set(),
  add(toast) {
    const id = `toast-${Date.now()}-${Math.random()}`
    const newToast = { ...toast, id }
    this.toasts = [...this.toasts, newToast]
    this.listeners.forEach((listener) => listener(this.toasts))

    // Auto remove after duration
    const duration = toast.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration)
    }
  },
  remove(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.listeners.forEach((listener) => listener(this.toasts))
  },
}

export function toast(message: string, type: ToastType = 'info', duration?: number) {
  toastStore.add({ type, message, duration })
}

toast.success = (message: string, duration?: number) => toast(message, 'success', duration)
toast.error = (message: string, duration?: number) => toast(message, 'error', duration)
toast.info = (message: string, duration?: number) => toast(message, 'info', duration)
toast.warning = (message: string, duration?: number) => toast(message, 'warning', duration)

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => setToasts(newToasts)
    toastStore.listeners.add(listener)
    return () => {
      toastStore.listeners.delete(listener)
    }
  }, [])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-400" />
    }
  }

  const getColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10'
      case 'error':
        return 'border-red-500/50 bg-red-500/10'
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/10'
      case 'info':
      default:
        return 'border-blue-500/50 bg-blue-500/10'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-start sm:justify-end">
      <div className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border backdrop-blur-sm p-4 shadow-lg transition-all duration-300 animate-slide-in ${getColor(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <p className="flex-1 text-sm text-slate-100">{toast.message}</p>
            <button
              onClick={() => toastStore.remove(toast.id)}
              className="flex-shrink-0 rounded p-1 transition-colors hover:bg-slate-700/50"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
