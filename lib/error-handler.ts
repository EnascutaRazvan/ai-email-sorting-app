import { toastManager } from "./toast-manager"

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

export class AppError extends Error {
  public readonly code?: string
  public readonly status?: number
  public readonly details?: any

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = status
    this.details = details
  }
}

export function handleApiError(error: any, context?: string): ApiError {
  console.error(`API Error${context ? ` in ${context}` : ""}:`, error)

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    }
  }

  if (error?.response) {
    // Axios-style error
    return {
      message: error.response.data?.message || error.message || "An error occurred",
      code: error.response.data?.code,
      status: error.response.status,
      details: error.response.data,
    }
  }

  if (error?.message) {
    return {
      message: error.message,
      status: 500,
    }
  }

  return {
    message: "An unexpected error occurred",
    status: 500,
  }
}

export function showErrorToast(error: any, context?: string) {
  const apiError = handleApiError(error, context)

  toastManager.error(apiError.message, context ? `Error in ${context}` : undefined)

  return apiError
}

export function showSuccessToast(title: string, description?: string) {
  return toastManager.success(title, description)
}
