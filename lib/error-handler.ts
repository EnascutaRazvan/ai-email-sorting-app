import { toast } from "sonner"

export function showErrorToast(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : String(error)
  const title = context ? `Error ${context}` : "Error"

  toast.error(title, {
    description: message,
    duration: 5000,
  })
}

export function showSuccessToast(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3000,
  })
}

export function showInfoToast(title: string, description?: string) {
  toast.info(title, {
    description,
    duration: 4000,
  })
}
