import { toast } from "@/hooks/use-toast"

export type ToastType = "success" | "error" | "warning" | "info"

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

class ToastManager {
  private toasts: Map<string, ToastMessage> = new Map()

  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  show(type: ToastType, title: string, description?: string, duration?: number) {
    const id = this.generateId()
    const toastMessage: ToastMessage = {
      id,
      type,
      title,
      description,
      duration: duration || (type === "error" ? 8000 : 4000),
    }

    this.toasts.set(id, toastMessage)

    const toastConfig = {
      title,
      description,
      duration: toastMessage.duration,
      variant: type === "error" ? ("destructive" as const) : ("default" as const),
    }

    const { dismiss } = toast(toastConfig)

    // Auto-remove from our tracking after duration
    setTimeout(() => {
      this.toasts.delete(id)
    }, toastMessage.duration)

    return { id, dismiss }
  }

  success(title: string, description?: string, duration?: number) {
    return this.show("success", title, description, duration)
  }

  error(title: string, description?: string, duration?: number) {
    return this.show("error", title, description, duration)
  }

  warning(title: string, description?: string, duration?: number) {
    return this.show("warning", title, description, duration)
  }

  info(title: string, description?: string, duration?: number) {
    return this.show("info", title, description, duration)
  }

  dismissAll() {
    this.toasts.clear()
    // Note: Individual toast dismissal would need to be handled by the toast library
  }
}

export const toastManager = new ToastManager()
