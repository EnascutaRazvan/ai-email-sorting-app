"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Mail, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { EmailImportButton } from "./email-import-button"
import { MultiAccountDialog } from "./multi-account-dialog"
import { toast } from "@/hooks/use-toast"

interface Account {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  last_sync?: string
  created_at: string
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      const result = await response.json()

      if (response.ok) {
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

  const getSyncStatus = (lastSync?: string) => {
    if (!lastSync) {
      return { status: "never", color: "text-gray-500", icon: Clock, text: "Never synced" }
    }

    const now = new Date()
    const syncDate = new Date(lastSync)
    const diffMinutes = Math.floor((now.getTime() - syncDate.getTime()) / (1000 * 60))

    if (diffMinutes < 30) {
      return { status: "recent", color: "text-green-600", icon: CheckCircle, text: `${diffMinutes}m ago` }
    } else if (diffMinutes < 60 * 4) {
      return { status: "hours", color: "text-blue-600", icon: Clock, text: `${Math.floor(diffMinutes / 60)}h ago` }
    } else if (diffMinutes < 60 * 24) {
      return { status: "day", color: "text-amber-600", icon: Clock, text: `${Math.floor(diffMinutes / 60)}h ago` }
    } else {
      return {
        status: "overdue",
        color: "text-red-600",
        icon: AlertCircle,
        text: `${Math.floor(diffMinutes / (60 * 24))}d ago`,
      }
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Connected Accounts
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No accounts connected</p>
              <p className="text-sm mb-4">Connect your Gmail account to start sorting emails</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Gmail Account
              </Button>
            </div>
          ) : (
            accounts.map((account, index) => {
              const syncStatus = getSyncStatus(account.last_sync)
              const StatusIcon = syncStatus.icon

              return (
                <div key={account.id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {account.picture ? (
                        <img
                          src={account.picture || "/placeholder.svg"}
                          alt={account.name || account.email}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.email}</p>
                          {account.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <StatusIcon className={`h-3 w-3 ${syncStatus.color}`} />
                          <span className={syncStatus.color}>Last sync: {syncStatus.text}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <EmailImportButton
                        accountId={account.id}
                        lastSync={account.last_sync}
                        onImportComplete={fetchAccounts}
                      />
                    </div>
                  </div>
                  {index < accounts.length - 1 && <Separator className="my-4" />}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <MultiAccountDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAccountAdded={fetchAccounts}
      />
    </>
  )
}
