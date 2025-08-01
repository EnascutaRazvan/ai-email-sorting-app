import { toast } from "sonner"

export type ToastType = "success" | "error" | "warning" | "info"

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

export class ToastManager {
  static success(title: string, description?: string) {
    toast.success(title, {
      description,
      duration: 3000,
    })
  }

  static error(title: string, description?: string) {
    toast.error(title, {
      description,
      duration: 5000,
    })
  }

  static warning(title: string, description?: string, duration?: number) {
    toast.warning(title, {
      description,
      duration: duration || 4000,
    })
  }

  static info(title: string, description?: string) {
    toast.info(title, {
      description,
      duration: 4000,
    })
  }

  static loading(title: string, description?: string) {
    return toast.loading(title, {
      description,
    })
  }

  static dismiss(toastId: string | number) {
    toast.dismiss(toastId)
  }
}
