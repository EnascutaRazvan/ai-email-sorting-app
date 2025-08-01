"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, CheckCircle, AlertCircle, Clock, Mail } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Account {
  id: string
  email: string
  name?: string
  last_sync?: string
  is_active: boolean
  created_at: string
}

interface EmailImportButtonProps {
  accounts: Account[]
  onImportComplete?: () => void
}

export function EmailImportButton({ accounts, onImportComplete }: EmailImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<any[]>([])

  const handleImport = async () => {
    if (accounts.length === 0) {
      toast({
        title: "No Accounts",
        description: "Please connect a Gmail account first",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setImportResults([])

    try {
      const response = await fetch("/api/emails/sync-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (result.success) {
        setImportResults(result.results || [])
        toast({
          title: "Import Complete",
          description: result.message,
        })
        onImportComplete?.()
      } else {
        throw new Error(result.error || "Import failed")
      }
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import emails",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getSyncStatus = (account: Account) => {
    if (!account.last_sync) {
      return { status: "never", color: "gray", text: "Never synced" }
    }

    const lastSync = new Date(account.last_sync)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60))

    if (diffMinutes < 30) {
      return { status: "recent", color: "green", text: `${diffMinutes}m ago` }
    } else if (diffMinutes < 60 * 4) {
      return { status: "hours", color: "blue", text: `${Math.floor(diffMinutes / 60)}h ago` }
    } else if (diffMinutes < 60 * 24) {
      return { status: "today", color: "amber", text: "Today" }
    } else {
      const diffDays = Math.floor(diffMinutes / (60 * 24))
      return { status: "days", color: "red", text: `${diffDays}d ago` }
    }
  }

  const getImportMessage = () => {
    if (accounts.length === 0) {
      return "No accounts connected"
    }

    const neverSynced = accounts.filter((a) => !a.last_sync).length
    const recentlySynced = accounts.filter((a) => {
      if (!a.last_sync) return false
      const diffMinutes = Math.floor((new Date().getTime() - new Date(a.last_sync).getTime()) / (1000 * 60))
      return diffMinutes < 30
    }).length

    if (neverSynced > 0) {
      return `Import emails from ${neverSynced} new account${neverSynced > 1 ? "s" : ""}`
    } else if (recentlySynced === accounts.length) {
      return "Check for new emails"
    } else {
      return "Sync recent emails"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Import
        </CardTitle>
        <CardDescription>Import and process emails from your connected Gmail accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Status */}
        {accounts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Connected Accounts</h4>
            {accounts.map((account) => {
              const syncStatus = getSyncStatus(account)
              return (
                <div key={account.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">{account.email}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      syncStatus.color === "green"
                        ? "bg-green-100 text-green-700"
                        : syncStatus.color === "blue"
                          ? "bg-blue-100 text-blue-700"
                          : syncStatus.color === "amber"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {syncStatus.text}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}

        {/* Import Button */}
        <Button onClick={handleImport} disabled={isImporting || accounts.length === 0} className="w-full">
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing Emails...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {getImportMessage()}
            </>
          )}
        </Button>

        {/* Auto-sync Notice */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded border">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-3 w-3 text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-300">Auto-sync enabled</span>
          </div>
          <p className="text-blue-600 dark:text-blue-400">
            New emails are automatically imported every 15 minutes in the background
          </p>
        </div>

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Import Results</h4>
            {importResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>{result.email}</span>
                </div>
                <span className={result.success ? "text-green-600" : "text-red-600"}>
                  {result.success ? `${result.imported} imported` : "Failed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
