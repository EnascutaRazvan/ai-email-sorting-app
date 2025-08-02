"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash, RefreshCcw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { MultiAccountDialog } from "./multi-account-dialog"
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

interface Account {
  id: string
  email: string
  name?: string
  last_sync_at?: string
}

interface ConnectedAccountsProps {
  onAccountsChange: () => void
}

export function ConnectedAccounts({ onAccountsChange }: ConnectedAccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isMultiAccountDialogOpen, setIsMultiAccountDialogOpen] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load connected accounts.",
        variant: "destructive",
      })
    }
  }

  const handleAccountConnected = () => {
    setIsMultiAccountDialogOpen(false)
    fetchAccounts()
    onAccountsChange() // Notify parent about account change
    toast({
      title: "Account Connected",
      description: "Your new email account has been successfully connected.",
    })
  }

  const openDeleteConfirm = (account: Account) => {
    setAccountToDelete(account)
    setIsConfirmDeleteOpen(true)
  }

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return

    setIsConfirmDeleteOpen(false)

    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete account")
      }

      toast({
        title: "Account Removed",
        description: `Account "${accountToDelete.email}" and its emails have been removed.`,
      })
      setAccountToDelete(null)
      fetchAccounts()
      onAccountsChange() // Notify parent about account change
      // Dispatch a custom event to notify other components (e.g., EmailList)
      window.dispatchEvent(new CustomEvent("accountRemoved", { detail: { accountId: accountToDelete.id } }))
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove account.",
        variant: "destructive",
      })
    }
  }

  const handleSyncAllAccounts = async () => {
    setIsSyncingAll(true)
    toast({
      title: "Syncing Emails",
      description: "Starting email synchronization for all connected accounts. This may take a moment.",
    })
    try {
      const response = await fetch("/api/emails/sync-all", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sync all accounts")
      }

      const data = await response.json()
      console.log("Sync results:", data.syncResults)
      toast({
        title: "Sync Complete",
        description: "All connected accounts have been synced.",
      })
      fetchAccounts() // Refresh accounts to show updated sync times
      onAccountsChange() // Trigger email list refresh
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sync accounts.",
        variant: "destructive",
      })
    } finally {
      setIsSyncingAll(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between rounded-md bg-muted/50 p-3">
                <div className="flex flex-col">
                  <span className="font-medium">{account.email}</span>
                  {account.last_sync_at && (
                    <span className="text-xs text-muted-foreground">
                      Last synced: {new Date(account.last_sync_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openDeleteConfirm(account)}>
                  <Trash className="h-4 w-4" />
                  <span className="sr-only">Remove account</span>
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button className="w-full" onClick={() => setIsMultiAccountDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Connect New Account
          </Button>
          <Button
            className="w-full bg-transparent"
            variant="outline"
            onClick={handleSyncAllAccounts}
            disabled={isSyncingAll || accounts.length === 0}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isSyncingAll ? "Syncing..." : "Sync All"}
          </Button>
        </div>
      </CardContent>

      <MultiAccountDialog
        isOpen={isMultiAccountDialogOpen}
        onClose={() => setIsMultiAccountDialogOpen(false)}
        onAccountConnected={handleAccountConnected}
      />

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Account Removal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the account &quot;{accountToDelete?.email}&quot;? This will also delete
              all emails imported from this account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount}>Remove Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
