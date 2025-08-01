"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle, Trash2, AlertCircle, Info } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { MultiAccountGuide } from "./multi-account-guide"

interface ConnectedAccount {
  id: string
  email: string
  is_primary: boolean
  created_at: string
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    fetchConnectedAccounts()
  }, [session])

  useEffect(() => {
    // Handle URL params for success/error messages
    const success = searchParams.get("success")
    const error = searchParams.get("error")

    if (success === "account_connected") {
      showSuccessToast("Account Connected", "New Gmail account has been successfully connected!")
      fetchConnectedAccounts() // Refresh the list
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: "Access was denied. Please try again and make sure to grant all permissions.",
        missing_params: "Missing required parameters. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code. Please try again.",
        user_info_failed: "Failed to get user information from Google.",
        storage_failed: "Failed to store account information. Please try again.",
        unexpected_error: "An unexpected error occurred. Please try again.",
      }

      showErrorToast(errorMessages[error] || "Failed to connect account", "Account Connection")
    }

    // Clean up URL params
    if (success || error) {
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      url.searchParams.delete("error")
      window.history.replaceState({}, "", url.toString())
    }
  }, [searchParams])

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

  const handleConnectNewAccount = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/auth/connect-account")
      if (response.ok) {
        const data = await response.json()

        // Open in new tab to avoid losing current session
        const newWindow = window.open(data.authUrl, "_blank", "width=500,height=600")

        // Check if the window was closed (user completed or cancelled)
        const checkClosed = setInterval(() => {
          if (newWindow?.closed) {
            clearInterval(checkClosed)
            setIsConnecting(false)
            // Refresh accounts in case connection was successful
            setTimeout(() => {
              fetchConnectedAccounts()
            }, 1000)
          }
        }, 1000)

        // Fallback: stop checking after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed)
          setIsConnecting(false)
        }, 300000)
      } else {
        throw new Error("Failed to generate auth URL")
      }
    } catch (error) {
      showErrorToast(error, "Connecting New Account")
      setIsConnecting(false)
    }
  }

  const handleRemoveAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}?`)) return

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
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
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {process.env.NODE_ENV === "development" && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Dev Mode:</strong> Multi-account requires Google OAuth verification in production.
            </AlertDescription>
          </Alert>
        )}

        {accounts.length === 0 ? (
          <div className="text-center py-4">
            <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No accounts connected yet</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{account.email}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Connected {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {account.is_primary && (
                  <Badge variant="secondary" className="text-xs">
                    Primary
                  </Badge>
                )}
                {!account.is_primary && (
                  <Button
                    onClick={() => handleRemoveAccount(account.id, account.email)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}

        <MultiAccountGuide onProceed={handleConnectNewAccount} isLoading={isConnecting} />
      </CardContent>
    </Card>
  )
}
