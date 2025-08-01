"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Plus, Settings, Trash2, CheckCircle, AlertCircle, Clock } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Account {
  id: string
  email: string
  name?: string
  provider: string
  is_active: boolean
  last_sync?: string
  created_at: string
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      const result = await response.json()

      if (result.success) {
        setAccounts(result.accounts || [])
      } else {
        throw new Error(result.error || "Failed to fetch accounts")
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load connected accounts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectAccount = () => {
    // Redirect to Google OAuth
    window.location.href = "/api/auth/connect-account"
  }

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (result.success) {
        setAccounts(accounts.filter((account) => account.id !== accountId))
        toast({
          title: "Account Disconnected",
          description: "Gmail account has been disconnected successfully",
        })
      } else {
        throw new Error(result.error || "Failed to disconnect account")
      }
    } catch (error) {
      console.error("Error disconnecting account:", error)
      toast({
        title: "Error",
        description: "Failed to disconnect account",
        variant: "destructive",
      })
    }
  }

  const getSyncStatus = (account: Account) => {
    if (!account.last_sync) {
      return {
        icon: AlertCircle,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        text: "Never synced",
      }
    }

    const lastSync = new Date(account.last_sync)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60))

    if (diffMinutes < 30) {
      return {
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "bg-green-100",
        text: `${diffMinutes}m ago`,
      }
    } else if (diffMinutes < 60 * 4) {
      return {
        icon: Clock,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        text: `${Math.floor(diffMinutes / 60)}h ago`,
      }
    } else {
      const diffDays = Math.floor(diffMinutes / (60 * 24))
      return {
        icon: AlertCircle,
        color: "text-red-600",
        bgColor: "bg-red-100",
        text: diffDays > 0 ? `${diffDays}d ago` : "Today",
      }
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>Manage your Gmail accounts for email import and processing</CardDescription>
          </div>
          <Button onClick={handleConnectAccount} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Connect Gmail
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No accounts connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your Gmail account to start importing and organizing your emails
            </p>
            <Button onClick={handleConnectAccount}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Your First Gmail Account
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account, index) => {
              const syncStatus = getSyncStatus(account)
              const StatusIcon = syncStatus.icon

              return (
                <div key={account.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{account.email}</h3>
                          {account.is_active ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusIcon className={`h-3 w-3 ${syncStatus.color}`} />
                          <span className="text-xs text-muted-foreground">Last sync: {syncStatus.text}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Connected {new Date(account.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnectAccount(account.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {index < accounts.length - 1 && <Separator className="my-2" />}
                </div>
              )
            })}

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Auto-sync enabled</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Your emails are automatically synced every 15 minutes. New emails are processed with AI categorization
                and summarization, then archived from your Gmail inbox.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
