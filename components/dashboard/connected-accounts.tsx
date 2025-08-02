"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mail, Plus, Trash2, RefreshCw, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { EmailImportDialog } from "./email-import-dialog"
import { formatDistanceToNow } from "date-fns"

interface Account {
  id: string
  gmail_id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  last_sync?: string
  created_at: string
}

interface ConnectedAccountsProps {
  onAccountChange?: () => void
}

export function ConnectedAccounts({ onAccountChange }: ConnectedAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set())
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [importDialog, setImportDialog] = useState<{ open: boolean; account: Account | null }>({
    open: false,
    account: null,
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (!response.ok) throw new Error("Failed to load accounts")

      const data = await response.json()
      setAccounts(data.accounts)
    } catch (error) {
      console.error("Error loading accounts:", error)
      toast.error("Failed to load connected accounts")
    } finally {
      setIsLoading(false)
    }
  }

  const connectAccount = async () => {
    try {
      const response = await fetch("/api/auth/connect-account", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to initiate connection")

      const data = await response.json()
      window.location.href = data.authUrl
    } catch (error) {
      console.error("Error connecting account:", error)
      toast.error("Failed to connect account")
    }
  }

  const syncAccount = async (accountId: string) => {
    setSyncingAccounts((prev) => new Set(prev).add(accountId))

    try {
      const response = await fetch("/api/emails/sync-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      })

      if (!response.ok) throw new Error("Failed to sync account")

      toast.success("Account sync started successfully!")
      loadAccounts()
      onAccountChange?.()
    } catch (error) {
      console.error("Error syncing account:", error)
      toast.error("Failed to sync account")
    } finally {
      setSyncingAccounts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const deleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete account")

      toast.success("Account removed successfully!")
      loadAccounts()
      onAccountChange?.()

      // Trigger email refiltering event
      window.dispatchEvent(new CustomEvent("accountDeleted", { detail: { accountId } }))
    } catch (error) {
      console.error("Error deleting account:", error)
      toast.error("Failed to remove account")
    } finally {
      setAccountToDelete(null)
    }
  }

  const getSyncStatus = (account: Account) => {
    if (syncingAccounts.has(account.id)) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600" />,
        text: "Syncing...",
        color: "text-blue-600",
      }
    }

    if (!account.last_sync) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
        text: "Never synced",
        color: "text-amber-600",
      }
    }

    const lastSyncDate = new Date(account.last_sync)
    const now = new Date()
    const hoursSinceSync = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60)

    if (hoursSinceSync < 1) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-600" />,
        text: `Last synced ${formatDistanceToNow(lastSyncDate, { addSuffix: true })}`,
        color: "text-green-600",
      }
    }

    return {
      icon: <Clock className="h-4 w-4 text-gray-600" />,
      text: `Last synced ${formatDistanceToNow(lastSyncDate, { addSuffix: true })}`,
      color: "text-gray-600",
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>Manage your connected Gmail accounts and sync settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-gray-600 mb-4">Connect your Gmail account to start organizing your emails with AI.</p>
              <Button onClick={connectAccount}>
                <Plus className="h-4 w-4 mr-2" />
                Connect Gmail Account
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {accounts.map((account) => {
                  const syncStatus = getSyncStatus(account)

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={account.picture || "/placeholder.svg"}
                            alt={account.name || account.email}
                          />
                          <AvatarFallback>{(account.name || account.email).charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {account.name || account.email}
                            </p>
                            {account.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{account.email}</p>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center gap-1 mt-1 ${syncStatus.color}`}>
                                  {syncStatus.icon}
                                  <span className="text-xs">{syncStatus.text}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white">
                                <p>
                                  {account.last_sync
                                    ? `Last synced: ${new Date(account.last_sync).toLocaleString()}`
                                    : "This account has never been synced"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setImportDialog({ open: true, account })}>
                          Import
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncAccount(account.id)}
                          disabled={syncingAccounts.has(account.id)}
                        >
                          {syncingAccounts.has(account.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAccountToDelete(account)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline" onClick={connectAccount} className="w-full bg-transparent">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Another Account
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Account Confirmation */}
      <AlertDialog open={accountToDelete !== null} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {accountToDelete?.email}? This will also delete all emails imported from
              this account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accountToDelete && deleteAccount(accountToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Import Dialog */}
      {importDialog.account && (
        <EmailImportDialog
          open={importDialog.open}
          onOpenChange={(open) => setImportDialog({ open, account: open ? importDialog.account : null })}
          accountId={importDialog.account.id}
          accountEmail={importDialog.account.email}
        />
      )}
    </>
  )
}
