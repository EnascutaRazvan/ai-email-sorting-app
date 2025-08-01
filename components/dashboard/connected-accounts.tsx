"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, CheckCircle, Trash2, AlertCircle, Shield, User, Clock, Zap } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { MultiAccountDialog } from "./multi-account-dialog"
import { EmailImportButton } from "./email-import-button"

interface ConnectedAccount {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  created_at: string
  token_expires_at?: string
  scope?: string
  last_sync?: string
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchConnectedAccounts()
  }, [session])

  useEffect(() => {
    // Handle URL params for success/error messages
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    const details = searchParams.get("details")

    if (success === "account_connected") {
      showSuccessToast("Account Connected", "New Gmail account has been successfully connected!")
      fetchConnectedAccounts()
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: "Access was denied. Please grant all required permissions to continue.",
        missing_params: "Missing required parameters. Please try again.",
        invalid_state: "Invalid security token. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code. Please try again.",
        user_info_failed: "Failed to get user information from Google.",
        invalid_user_info: "Invalid user information received from Google.",
        account_already_connected: "This Gmail account is already connected to another user.",
        storage_failed: "Failed to store account information. Please try again.",
        oauth_error: "OAuth authorization failed. Please try again.",
        unexpected_error: "An unexpected error occurred. Please try again.",
      }

      const message = errorMessages[error] || "Failed to connect account"
      const description = details ? `Details: ${decodeURIComponent(details)}` : undefined

      showErrorToast(message, description || "Account Connection")
    }

    // Clean up URL params
    if (success || error) {
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      url.searchParams.delete("error")
      url.searchParams.delete("details")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

  // Listen for popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ACCOUNT_CONNECTED") {
        showSuccessToast("Account Connected", `${event.data.email} has been successfully connected!`)
        fetchConnectedAccounts()
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const fetchConnectedAccounts = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts)
      } else {
        throw new Error("Failed to fetch accounts")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Connected Accounts")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAccount = async (accountId: string, email: string, isPrimary: boolean) => {
    if (isPrimary) {
      showErrorToast("Cannot remove primary account", "Primary Account")
      return
    }

    if (!confirm(`Are you sure you want to remove ${email}?\n\nThis will stop syncing emails from this account.`)) {
      return
    }

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAccounts(accounts.filter((account) => account.id !== accountId))
        showSuccessToast("Account Removed", `${email} has been disconnected`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove account")
      }
    } catch (error) {
      showErrorToast(error, "Removing Account")
    }
  }

  const getLastSyncInfo = (account: ConnectedAccount) => {
    if (!account.last_sync) {
      return {
        text: "Never synced",
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        icon: Clock,
      }
    }

    const lastSync = new Date(account.last_sync)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60))

    if (diffMinutes < 30) {
      return {
        text: "Recently synced",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
      }
    } else if (diffMinutes < 60) {
      return {
        text: `${diffMinutes}m ago`,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        icon: Clock,
      }
    } else {
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) {
        return {
          text: `${diffHours}h ago`,
          color: "text-amber-600",
          bgColor: "bg-amber-100",
          icon: Clock,
        }
      } else {
        const diffDays = Math.floor(diffHours / 24)
        return {
          text: `${diffDays}d ago`,
          color: "text-red-600",
          bgColor: "bg-red-100",
          icon: AlertCircle,
        }
      }
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-xl">
                <div className="w-10 h-10 bg-gray-300 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-300 rounded w-3/4" />
                  <div className="h-2 bg-gray-300 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
            <Mail className="mr-2 h-4 w-4 text-blue-600" />
            Gmail Accounts
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
              {accounts.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-sync Notice */}
        <Alert className="border-blue-200 bg-blue-50/50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            <strong>Auto-sync enabled:</strong> New emails are automatically imported every 15 minutes.
          </AlertDescription>
        </Alert>

        {/* Security Notice */}
        <Alert className="border-green-200 bg-green-50/50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-xs text-green-800">
            Secured with Google OAuth 2.0. Your credentials are never stored.
          </AlertDescription>
        </Alert>

        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Gmail</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              Start by connecting your Gmail accounts to manage all your emails in one place with automatic AI
              processing
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const syncInfo = getLastSyncInfo(account)
              const SyncIcon = syncInfo.icon

              return (
                <div
                  key={account.id}
                  className="group relative bg-gradient-to-r from-white to-gray-50/50 border border-gray-200/50 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                        <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-medium">
                          {account.name ? (
                            account.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                        <CheckCircle className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-sm text-gray-900 truncate">{account.email}</p>
                        {account.is_primary && (
                          <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs px-2 py-0.5">
                            Primary
                          </Badge>
                        )}
                      </div>

                      {account.name && <p className="text-xs text-gray-600 truncate mb-1">{account.name}</p>}

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                          Connected {new Date(account.created_at).toLocaleDateString()}
                        </div>
                        <span className="text-gray-400">•</span>
                        <div className={`flex items-center text-xs ${syncInfo.color}`}>
                          <SyncIcon className="h-3 w-3 mr-1" />
                          {syncInfo.text}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!account.is_primary && (
                        <Button
                          onClick={() => handleRemoveAccount(account.id, account.email, account.is_primary)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Email Import Button */}
        {accounts.length > 0 && <EmailImportButton accounts={accounts} onImportComplete={fetchConnectedAccounts} />}

        {/* Connection Dialog */}
        <MultiAccountDialog onAccountConnected={fetchConnectedAccounts} existingAccounts={accounts.length} />

        {/* Development Notice */}
        {process.env.NODE_ENV === "development" && (
          <Alert variant="destructive" className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              <strong>Dev Mode:</strong> Configure Google Cloud Console if you encounter OAuth errors.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
