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
import { Download, Mail, CheckCircle, Loader2, User } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface ConnectedAccount {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
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
        body: JSON.stringify({ accountId }),
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast(
          "Emails Imported Successfully",
          `Imported ${data.imported} new emails from ${accountEmail}. ${data.processed - data.imported} emails were already imported.`,
        )
        onImportComplete()
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
    const importPromises = accounts.map((account) => handleImportEmails(account.id, account.email))

    await Promise.all(importPromises)
    setIsOpen(false)
  }

  if (accounts.length === 0) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm">
          <Download className="mr-2 h-4 w-4" />
          Import Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <Mail className="mr-2 h-5 w-5 text-green-600" />
            Import Emails from Gmail
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Import new emails from your connected Gmail accounts. Emails will be automatically categorized and
            summarized using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Import All Button */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-green-900">Import from All Accounts</h4>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {accounts.length} accounts
              </Badge>
            </div>
            <p className="text-xs text-green-800 mb-3">Import emails from all connected accounts simultaneously</p>
            <Button
              onClick={handleImportAll}
              disabled={importingAccounts.size > 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="sm"
            >
              {importingAccounts.size > 0 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
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
            <h4 className="text-sm font-medium text-gray-900">Or import from individual accounts:</h4>
            {accounts.map((account) => {
              const isImporting = importingAccounts.has(account.id)

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
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
                      <p className="text-sm font-medium text-gray-900 truncate">{account.email}</p>
                      {account.name && <p className="text-xs text-gray-600 truncate">{account.name}</p>}
                      {account.is_primary && <Badge className="bg-blue-100 text-blue-700 text-xs mt-1">Primary</Badge>}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleImportEmails(account.id, account.email)}
                    disabled={isImporting}
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
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">What happens during import:</p>
                <ul className="space-y-1">
                  <li>• New emails are fetched from your Gmail inbox</li>
                  <li>• AI automatically categorizes and summarizes each email</li>
                  <li>• Emails are archived in Gmail (not deleted)</li>
                  <li>• Duplicates are automatically skipped</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
