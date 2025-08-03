"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Download, Mail, CheckCircle, Loader2, User, Clock, Zap, Info } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface ConnectedAccount {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
  last_sync?: string
  created_at: string
}

interface EmailImportButtonProps {
  accounts: ConnectedAccount[]
  onImportComplete: () => void
}

export function EmailImportButton({ accounts, onImportComplete }: EmailImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [importingAccounts, setImportingAccounts] = useState<Set<string>>(new Set())

  const handleImportEmails = async (accountId: string, accountEmail: string) => {
    setImportingAccounts((prev) => new Set(prev).add(accountId))

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId, isScheduled: false }),
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast(
          "Emails Imported Successfully",
          `Imported ${data.imported} new emails from ${accountEmail}. ${data.processed - data.imported} emails were already imported.`,
        )

        // Call the parent's import complete handler
        onImportComplete()

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent("emailsChanged"))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to import emails")
      }
    } catch (error) {
      showErrorToast(error, `Importing emails from ${accountEmail}`)
    } finally {
      setImportingAccounts((prev) => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const handleImportAll = async () => {
    // Import from all accounts sequentially to avoid overwhelming the API
    for (const account of accounts) {
      await handleImportEmails(account.id, account.email)
    }

    // Close dialog after all imports are complete
    setIsOpen(false)

    // Final refresh after all imports
    onImportComplete()
  }

  const getLastSyncInfo = (account: ConnectedAccount) => {
    if (!account.last_sync) {
      return {
        text: "Never synced",
        color: "text-amber-600",
        icon: Clock,
      }
    }

    const lastSync = new Date(account.last_sync)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60))

    if (diffHours < 1) {
      return {
        text: "Recently synced",
        color: "text-green-600",
        icon: CheckCircle,
      }
    } else if (diffHours < 24) {
      return {
        text: `${diffHours}h ago`,
        color: "text-blue-600",
        icon: Clock,
      }
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return {
        text: `${diffDays}d ago`,
        color: "text-amber-600",
        icon: Clock,
      }
    }
  }

  if (accounts.length === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
          <Download className="mr-2 h-4 w-4" />
          Import Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <Mail className="mr-2 h-5 w-5 text-green-600" />
            Import Emails from Gmail
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Import new emails from your connected Gmail accounts. Emails will be automatically categorized and
            summarized using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-sync Notice */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Zap className="h-4 w-4 text-blue-600 mr-2" />
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Smart Email Sync</h4>
            </div>
            <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
              Emails are automatically imported every 15 minutes. Manual import fetches emails since your last sync.
            </p>
          </div>

          {/* Import All Button */}
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-green-900 dark:text-green-100">Import from All Accounts</h4>
              <Badge variant="secondary" className="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200">
                {accounts.length} accounts
              </Badge>
            </div>
            <p className="text-xs text-green-800 dark:text-green-200 mb-3">
              Import emails from all connected accounts simultaneously
            </p>
            <Button
              onClick={handleImportAll}
              disabled={importingAccounts.size > 0}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {importingAccounts.size > 0 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing from {importingAccounts.size} account{importingAccounts.size > 1 ? "s" : ""}...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import All
                </>
              )}
            </Button>
          </div>

          {/* Individual Account Import */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Or import from individual accounts:</h4>
            {accounts.map((account) => {
              const isImporting = importingAccounts.has(account.id)
              const syncInfo = getLastSyncInfo(account)
              const SyncIcon = syncInfo.icon

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {account.name ? (
                          account.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{account.email}</p>
                      {account.name && <p className="text-xs text-muted-foreground truncate">{account.name}</p>}
                      <div className="flex items-center mt-1">
                        {account.is_primary && (
                          <Badge className="bg-primary text-primary-foreground text-xs mr-2">Primary</Badge>
                        )}
                        <div className={`flex items-center text-xs ${syncInfo.color}`}>
                          <SyncIcon className="h-3 w-3 mr-1" />
                          {syncInfo.text}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleImportEmails(account.id, account.email)}
                    disabled={isImporting || importingAccounts.size > 0}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-1 h-3 w-3" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">What happens during import:</p>
                <ul className="space-y-1">
                  <li>• Fetches emails since your last sync or account creation</li>
                  <li>• AI automatically categorizes and summarizes each email</li>
                  <li>• Emails are archived in Gmail (not deleted)</li>
                  <li>• Duplicates are automatically skipped</li>
                  <li>• Auto-sync runs every 15 minutes in the background</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
