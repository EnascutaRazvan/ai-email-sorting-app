"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, User, Settings } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface Account {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  created_at: string
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [session])

  const fetchAccounts = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts)
      }
    } catch (error) {
      showErrorToast(error, "Fetching Accounts")
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      window.location.href = "/api/auth/connect-account?returnUrl=" + encodeURIComponent(window.location.pathname)
    } catch (error) {
      showErrorToast(error, "Connecting Account")
      setIsConnecting(false)
    }
  }

  const handleSetPrimary = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_primary: true }),
      })

      if (response.ok) {
        // Update local state
        setAccounts(
          accounts.map((acc) => ({
            ...acc,
            is_primary: acc.id === accountId,
          })),
        )
        showSuccessToast("Primary Account Updated", "The primary account has been changed successfully.")
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update primary account")
      }
    } catch (error) {
      showErrorToast(error, "Updating Primary Account")
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4" />
                  <div className="h-3 bg-gray-300 rounded w-1/2" />
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
            Connected Accounts
          </CardTitle>
          <Button
            onClick={handleConnectAccount}
            disabled={isConnecting}
            size="sm"
            variant="outline"
            className="bg-transparent"
          >
            {isConnecting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No accounts connected</h3>
            <p className="text-xs text-gray-600 mb-4">Connect your Gmail accounts to start organizing your emails</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center space-x-3 p-3 bg-white border border-gray-200/50 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
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
                  <p className="text-sm font-medium text-gray-900 truncate">{account.email}</p>
                  {account.is_primary && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      Primary
                    </Badge>
                  )}
                </div>
                {account.name && <p className="text-xs text-gray-600 truncate">{account.name}</p>}
              </div>
              {!account.is_primary && (
                <Button onClick={() => handleSetPrimary(account.id)} size="sm" variant="ghost" className="text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Set Primary
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
