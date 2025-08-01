"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, CheckCircle, Trash2, AlertCircle, Shield, Clock, User, AlertTriangle } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { MultiAccountDialog } from "./multi-account-dialog"

interface ConnectedAccount {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  created_at: string
  token_expires_at?: string
  scope?: string
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

  const isTokenExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false
    const expiryTime = new Date(expiresAt).getTime()
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    return expiryTime - now < oneHour
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          Connected Accounts
          <Badge variant="secondary" className="ml-2">
            {accounts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            All connections use Google's secure OAuth 2.0. Your passwords are never stored.
          </AlertDescription>
        </Alert>

        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium mb-2">No accounts connected</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Connect your Gmail accounts to start managing your emails
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                    <AvatarFallback>
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-sm truncate">{account.email}</p>
                      {account.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      {isTokenExpiringSoon(account.token_expires_at) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Expires Soon
                        </Badge>
                      )}
                    </div>

                    {account.name && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{account.name}</p>
                    )}

                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                      Connected {new Date(account.created_at).toLocaleDateString()}
                      {account.token_expires_at && (
                        <>
                          <Clock className="ml-2 mr-1 h-3 w-3" />
                          Expires {new Date(account.token_expires_at).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!account.is_primary && (
                    <Button
                      onClick={() => handleRemoveAccount(account.id, account.email, account.is_primary)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connection Dialog */}
        <MultiAccountDialog onAccountConnected={fetchConnectedAccounts} existingAccounts={accounts.length} />

        {/* Development Notice */}
        {process.env.NODE_ENV === "development" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Dev Mode:</strong> Add test users in Google Cloud Console to avoid OAuth warnings.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
