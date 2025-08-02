"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, PlusCircle, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MultiAccountDialog } from "./multi-account-dialog"

interface Account {
  id: string
  email: string
  provider: string
  provider_account_id: string
  access_token: string
  refresh_token: string
  expires_at: number
  scope: string
  token_type: string
  session_state: string
  created_at: string
  last_synced_at: string | null
  disconnected?: boolean // Added for disconnected accounts
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [accountToRemove, setAccountToRemove] = useState<Account | null>(null)
  const [showMultiAccountDialog, setShowMultiAccountDialog] = useState(false)
  const { toast } = useToast()

  const fetchAccounts = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch("/api/accounts")
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setAccounts(data)
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load connected accounts.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [session])

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch("/api/auth/connect-account", {
        method: "POST", // Changed to POST
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch (error: any) {
      console.error("Error connecting account:", error)
      toast({
        title: "Connection Failed",
        description: error.message || "Could not initiate Google account connection.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRemoveAccount = async () => {
    if (!accountToRemove) return

    setIsRemoving(accountToRemove.id)
    try {
      const res = await fetch(`/api/accounts/${accountToRemove.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }

      setAccounts((prevAccounts) => prevAccounts.filter((acc) => acc.id !== accountToRemove.id))
      toast({
        title: "Account Removed",
        description: "The account has been disconnected. Its emails are now hidden.",
        variant: "default",
      })
      // Trigger a re-fetch of emails to update the list
      window.dispatchEvent(new Event("emailListRefresh"))
    } catch (error: any) {
      console.error("Error removing account:", error)
      toast({
        title: "Removal Failed",
        description: error.message || "Could not remove the account.",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(null)
      setShowRemoveDialog(false)
      setAccountToRemove(null)
    }
  }

  const confirmRemoveAccount = (account: Account) => {
    setAccountToRemove(account)
    setShowRemoveDialog(true)
  }

  const connectedAccountCount = accounts.filter((acc) => !acc.disconnected).length

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
        <div className="flex items-center gap-2">
          {connectedAccountCount > 1 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-1" />
                    <span>{connectedAccountCount} Accounts</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Emails from all {connectedAccountCount} connected accounts are shown in your inbox.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowMultiAccountDialog(true)} disabled={isConnecting}>
            {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Connect Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No accounts connected yet.</div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`flex items-center justify-between p-3 rounded-md border ${
                  account.disconnected ? "border-orange-300 bg-orange-50/50" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {account.disconnected ? (
                    <XCircle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {account.email}
                      {account.disconnected && <span className="ml-2 text-sm text-orange-600">(Disconnected)</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      Last synced:{" "}
                      {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString() : "Never"}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => confirmRemoveAccount(account)}
                      disabled={isRemoving === account.id}
                    >
                      {isRemoving === account.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Remove Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to remove this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect <span className="font-bold">{accountToRemove?.email}</span> from your AI Email
              Sorting app. Emails previously imported from this account will be **hidden** from your inbox but will
              remain in the database. You can reconnect this account later to make them visible again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAccount} disabled={isRemoving !== null}>
              {isRemoving !== null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MultiAccountDialog open={showMultiAccountDialog} onOpenChange={setShowMultiAccountDialog} />
    </Card>
  )
}
