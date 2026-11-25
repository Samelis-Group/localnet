import { create } from 'zustand'
import { uid } from '../../lib/format'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  kind: ToastKind
}

interface ToastStore {
  toasts: Toast[]
  push: (message: string, kind?: ToastKind) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push(message, kind = 'success') {
    const id = uid()
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600)
  },
  remove(id) { set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })) },
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push(message, 'success'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
  info: (message: string) => useToastStore.getState().push(message, 'info'),
}
