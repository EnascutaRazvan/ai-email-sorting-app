"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Mail, CheckCircle, Trash2, AlertCircle, Shield, User, Clock, Zap, ChevronDown, Info } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { MultiAccountDialog } from "./multi-account-dialog"
import { EmailImportButton } from "./email-import-button"
import { cn } from "@/lib/utils"

interface ConnectedAccount {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  created_at: string
  token_expires_at?: string
  scope?: string
  last_sync?: string
  users?: UserColumn
}

interface UserColumn {
  image?: string
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInfoExpanded, setIsInfoExpanded] = useState(false)

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

    if (
      !confirm(
        `Are you sure you want to remove ${email}?\n\nThis will stop syncing emails from this account and remove all associated emails from your dashboard.`,
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAccounts(accounts.filter((account) => account.id !== accountId))
        showSuccessToast("Account Removed", `${email} has been disconnected and associated emails removed`)
        // Trigger email list refresh
        window.dispatchEvent(new CustomEvent("accountRemoved", { detail: { accountId } }))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove account")
      }
    } catch (error) {
      showErrorToast(error, "Removing Account")
    }
  }

  const getLastSyncInfo = (account: ConnectedAccount) => {
    if (!account.last_sync) {
      return {
        text: "Never synced",
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        icon: Clock,
      }
    }

    const lastSync = new Date(account.last_sync)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60))

    if (diffMinutes < 30) {
      return {
        text: "Recently synced",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
      }
    } else if (diffMinutes < 60) {
      return {
        text: `${diffMinutes}m ago`,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        icon: Clock,
      }
    } else {
      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) {
        return {
          text: `${diffHours}h ago`,
          color: "text-amber-600",
          bgColor: "bg-amber-100",
          icon: Clock,
        }
      } else {
        const diffDays = Math.floor(diffHours / 24)
        return {
          text: `${diffDays}d ago`,
          color: "text-red-600",
          bgColor: "bg-red-100",
          icon: AlertCircle,
        }
      }
    }
  }

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-muted rounded-xl">
                <div className="w-10 h-10 bg-muted-foreground/20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                  <div className="h-2 bg-muted-foreground/20 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground flex items-center">
              <Mail className="mr-2 h-4 w-4 text-primary" />
              Gmail Accounts
              <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground text-xs">
                {accounts.length}
              </Badge>
            </CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Emails are automatically imported every 15 minutes. Secured with Google OAuth 2.0 - your credentials
                  are never stored.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Collapsible Info Section */}
          <Collapsible open={isInfoExpanded} onOpenChange={setIsInfoExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground h-8">
                <div className="flex items-center">
                  <Shield className="h-3 w-3 mr-1" />
                  Security & Auto-sync Info
                </div>
                <ChevronDown className={cn("h-3 w-3 transition-transform", isInfoExpanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
                <div className="flex items-center">
                  <Zap className="h-3 w-3 text-primary mr-1" />
                  <span className="font-medium">Auto-sync:</span> New emails imported every 15 minutes
                </div>
                <div className="flex items-center">
                  <Shield className="h-3 w-3 text-green-600 mr-1" />
                  <span className="font-medium">Security:</span> Google OAuth 2.0 - credentials never stored
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-purple-600 mr-1" />
                  <span className="font-medium">AI Processing:</span> Automatic categorization and summarization
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Connect Your Gmail</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Start by connecting your Gmail accounts to manage all your emails in one place with automatic AI
                processing
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const syncInfo = getLastSyncInfo(account)
                const SyncIcon = syncInfo.icon

                return (
                  <div
                    key={account.id}
                    className="group relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:border-border/80"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                          <AvatarImage
                            src={account.picture || account.users?.image || "/placeholder.svg"}
                            alt={account.name || account.email}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
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
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full flex items-center justify-center">
                          <CheckCircle className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-sm text-foreground truncate">{account.email}</p>
                          {account.is_primary && (
                            <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">Primary</Badge>
                          )}
                        </div>

                        {account.name && <p className="text-xs text-muted-foreground truncate mb-1">{account.name}</p>}

                        <div className="flex items-center space-x-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                            Connected {new Date(account.created_at).toLocaleDateString()}
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={`flex items-center text-xs ${syncInfo.color}`}>
                                <SyncIcon className="h-3 w-3 mr-1" />
                                {syncInfo.text}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Last sync: {account.last_sync ? new Date(account.last_sync).toLocaleString() : "Never"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {!account.is_primary && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleRemoveAccount(account.id, account.email, account.is_primary)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove account and all associated emails</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Email Import Button */}
          {accounts.length > 0 && <EmailImportButton accounts={accounts} onImportComplete={fetchConnectedAccounts} />}

          {/* Connection Dialog */}
          <MultiAccountDialog onAccountConnected={fetchConnectedAccounts} existingAccounts={accounts.length} />
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
