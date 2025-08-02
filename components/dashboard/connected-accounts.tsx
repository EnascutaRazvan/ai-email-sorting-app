"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Mail, Trash2, RefreshCw } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
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
import { MultiAccountDialog } from "./multi-account-dialog"

interface Account {
  id: string
  email: string
  name?: string
  image?: string
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [isMultiAccountDialogOpen, setIsMultiAccountDialogOpen] = useState(false)
  const [isSyncingAll, setIsSyncingAll] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccounts()
    }
  }, [session])

  const fetchAccounts = async () => {
    setIsLoading(true)
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

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "NA"
  }

  const openDeleteDialog = (account: Account) => {
    setAccountToDelete(account)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return

    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        showSuccessToast("Account Removed", `Account "${accountToDelete.email}" removed successfully.`)
        fetchAccounts()
        // Dispatch a custom event to notify other components (e.g., EmailList)
        window.dispatchEvent(new CustomEvent("accountRemoved", { detail: { accountId: accountToDelete.id } }))
      } else {
        throw new Error("Failed to remove account")
      }
    } catch (error) {
      showErrorToast(error, "Remove Account")
    } finally {
      setIsDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const handleSyncAllAccounts = async () => {
    setIsSyncingAll(true)
    try {
      const response = await fetch("/api/emails/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (response.ok) {
        const data = await response.json()
        showSuccessToast("Sync Complete", `Synced ${data.totalEmailsSynced} emails across all accounts.`)
        // Trigger a refresh of categories and email list in dashboard page
        window.dispatchEvent(new CustomEvent("emailsChanged"))
      } else {
        throw new Error("Failed to sync all accounts")
      }
    } catch (error) {
      showErrorToast(error, "Sync All Accounts")
    } finally {
      setIsSyncingAll(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 dark:bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center">
            <Mail className="mr-2 h-4 w-4 text-primary" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-0 bg-white/50 dark:bg-background/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-foreground flex items-center">
          <Mail className="mr-2 h-4 w-4 text-primary" />
          Connected Accounts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm">No accounts connected.</div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={account.image || "/placeholder-user.jpg"} alt={account.name || account.email} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(account.name, account.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none text-foreground">
                        {account.name || "Unnamed Account"}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/90"
                    onClick={() => openDeleteDialog(account)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => setIsMultiAccountDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Connect New Account
            </Button>
            {accounts.length > 0 && (
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleSyncAllAccounts}
                disabled={isSyncingAll}
              >
                {isSyncingAll ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isSyncingAll ? "Syncing All..." : "Sync All Accounts"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the account "{accountToDelete?.email}" and
              delete all associated emails from your database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MultiAccountDialog
        isOpen={isMultiAccountDialogOpen}
        onClose={() => setIsMultiAccountDialogOpen(false)}
        onAccountConnected={fetchAccounts}
      />
    </Card>
  )
}
