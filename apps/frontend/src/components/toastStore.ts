type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export const toastStore: {
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

    const duration = toast.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration)
    }
  },
  remove(id) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id)
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
