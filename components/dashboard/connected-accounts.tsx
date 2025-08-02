"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mail, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, Crown } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { MultiAccountDialog } from "./multi-account-dialog"

interface Account {
  id: string
  email: string
  name?: string
  is_primary: boolean
  sync_enabled: boolean
  last_sync_at?: string
  created_at: string
}

interface ConnectedAccountsProps {
  onAccountsChange?: () => void
}

export function ConnectedAccounts({ onAccountsChange }: ConnectedAccountsProps) {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null)
  const [showMultiAccountDialog, setShowMultiAccountDialog] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccounts()
    }
  }, [session])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      } else {
        throw new Error("Failed to fetch accounts")
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
      const response = await fetch("/api/auth/connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      } else {
        throw new Error("Failed to initiate account connection")
      }
    } catch (error) {
      showErrorToast(error, "Connecting Account")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRemoveAccount = async (accountId: string) => {
    setRemovingAccountId(accountId)
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast(
          "Account Disconnected",
          data.message || "Account has been disconnected. All emails have been preserved.",
        )
        fetchAccounts()
        onAccountsChange?.()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove account")
      }
    } catch (error) {
      showErrorToast(error, "Removing Account")
    } finally {
      setRemovingAccountId(null)
    }
  }

  const getAccountInitials = (email: string, name?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  const formatLastSync = (lastSyncAt?: string) => {
    if (!lastSyncAt) return "Never"

    const date = new Date(lastSyncAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffMinutes = Math.ceil(diffTime / (1000 * 60))

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    } else if (diffMinutes < 1440) {
      return `${Math.ceil(diffMinutes / 60)}h ago`
    } else {
      return `${Math.ceil(diffMinutes / 1440)}d ago`
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading accounts...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
              <Mail className="mr-2 h-4 w-4 text-blue-600" />
              Connected Accounts
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
                {accounts.length}
              </Badge>
            </CardTitle>
            <Button
              onClick={handleConnectAccount}
              disabled={isConnecting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Connect Account
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-xs text-gray-600 mb-4">Connect your Gmail account to start organizing your emails</p>
              <Button
                onClick={handleConnectAccount}
                disabled={isConnecting}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Connect Gmail Account
              </Button>
            </div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200/50 bg-white/30 hover:bg-white/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" alt={account.name || account.email} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm">
                      {getAccountInitials(account.email, account.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{account.name || account.email}</p>
                      {account.is_primary && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Crown className="h-4 w-4 text-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Primary Account</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {account.name && <p className="text-xs text-gray-600 truncate">{account.email}</p>}
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center space-x-1">
                        {account.sync_enabled ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-orange-500" />
                        )}
                        <span className="text-xs text-gray-500">
                          {account.sync_enabled ? "Sync enabled" : "Sync disabled"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">Last sync: {formatLastSync(account.last_sync_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!account.is_primary && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removingAccountId === account.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removingAccountId === account.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to disconnect <strong>{account.email}</strong>?
                            <br />
                            <br />
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                              <div className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
                                  <strong>Don't worry!</strong> All your existing emails will be preserved and remain
                                  accessible. Only the account connection will be removed, and email syncing will stop.
                                </div>
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveAccount(account.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Disconnect Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <MultiAccountDialog
        isOpen={showMultiAccountDialog}
        onClose={() => setShowMultiAccountDialog(false)}
        onAccountsChange={() => {
          fetchAccounts()
          onAccountsChange?.()
        }}
      />
    </TooltipProvider>
  )
}
