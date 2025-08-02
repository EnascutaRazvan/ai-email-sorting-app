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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Download, Mail, CheckCircle, Loader2, User, Clock, Zap, CalendarIcon, X } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

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
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  const handleImportEmails = async (accountId: string, accountEmail: string, useCustomRange = false) => {
    setImportingAccounts((prev) => new Set(prev).add(accountId))

    try {
      const requestBody: any = { accountId, isScheduled: false }

      if (useCustomRange && dateFrom && dateTo) {
        requestBody.dateFrom = dateFrom.toISOString()
        requestBody.dateTo = dateTo.toISOString()
      }

      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        const dateRangeText =
          useCustomRange && dateFrom && dateTo ? ` from ${format(dateFrom, "MMM d")} to ${format(dateTo, "MMM d")}` : ""

        showSuccessToast(
          "Emails Imported Successfully",
          `Imported ${data.imported} new emails from ${accountEmail}${dateRangeText}. ${data.processed - data.imported} emails were already imported.`,
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
    const importPromises = accounts.map((account) => handleImportEmails(account.id, account.email, false))
    await Promise.all(importPromises)
    setIsOpen(false)
  }

  const handleImportWithDateRange = async (accountId: string, accountEmail: string) => {
    if (!dateFrom || !dateTo) {
      showErrorToast("Please select both start and end dates", "Date Range Required")
      return
    }

    if (dateFrom > dateTo) {
      showErrorToast("Start date must be before end date", "Invalid Date Range")
      return
    }

    await handleImportEmails(accountId, accountEmail, true)
  }

  const clearDateRange = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
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
        text: "Synced recently",
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
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-sm">
          <Download className="mr-2 h-4 w-4" />
          Import Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg text-gray-900">
            <Mail className="mr-2 h-5 w-5 text-green-600" />
            Import Emails from Gmail
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Import new emails from your connected Gmail accounts. Emails will be automatically categorized and
            summarized using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto-sync Notice */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Zap className="h-4 w-4 text-blue-600 mr-2" />
              <h4 className="text-sm font-medium text-blue-900">Smart Email Sync</h4>
            </div>
            <p className="text-xs text-blue-800">
              Emails are automatically imported every 15 minutes. Manual import fetches emails since your last sync or
              within a custom date range.
            </p>
          </div>

          {/* Date Range Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 text-blue-600 mr-2" />
                <h4 className="text-sm font-medium text-blue-900">Custom Date Range</h4>
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  onClick={clearDateRange}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-blue-700 hover:text-blue-900"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-blue-800 mb-3">
              Import emails from a specific time period. Leave empty to import since last sync.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-blue-700 font-medium">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm bg-white border-blue-200 hover:bg-blue-50",
                        !dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-blue-700 font-medium">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm bg-white border-blue-200 hover:bg-blue-50",
                        !dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {dateFrom && dateTo && (
              <div className="mt-3 p-2 bg-blue-100 rounded-md">
                <p className="text-xs text-blue-800 font-medium">
                  📅 Will import emails from {format(dateFrom, "MMM d, yyyy")} to {format(dateTo, "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>

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
                  Import All (Since Last Sync)
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Individual Account Import */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900">Or import from individual accounts:</h4>
            {accounts.map((account) => {
              const isImporting = importingAccounts.has(account.id)
              const syncInfo = getLastSyncInfo(account)
              const SyncIcon = syncInfo.icon

              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
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
                      <div className="flex items-center mt-1 space-x-2">
                        {account.is_primary && <Badge className="bg-blue-100 text-blue-700 text-xs">Primary</Badge>}
                        <div className={`flex items-center text-xs ${syncInfo.color}`}>
                          <SyncIcon className="h-3 w-3 mr-1" />
                          {account.last_sync
                            ? `Last synced on ${new Date(account.last_sync).toLocaleDateString()} at ${new Date(account.last_sync).toLocaleTimeString()}`
                            : "Never synced"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {dateFrom && dateTo && (
                      <Button
                        onClick={() => handleImportWithDateRange(account.id, account.email)}
                        disabled={isImporting}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            Date Range
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleImportEmails(account.id, account.email, false)}
                      disabled={isImporting}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="mr-1 h-3 w-3" />
                          Since Last Sync
                        </>
                      )}
                    </Button>
                  </div>
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
                  <li>• Fetches emails from the specified date range or since last sync</li>
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
