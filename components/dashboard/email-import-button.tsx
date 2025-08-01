"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface EmailImportButtonProps {
  accountId: string
  lastSync?: string | null
  onImportComplete?: () => void
}

export function EmailImportButton({ accountId, lastSync, onImportComplete }: EmailImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    setIsImporting(true)

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Import Successful",
          description: `Imported ${result.newEmails} new emails (${result.processed} processed total)`,
        })
        onImportComplete?.()
      } else {
        throw new Error(result.error || "Import failed")
      }
    } catch (error) {
      console.error("Import error:", error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import emails",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getButtonText = () => {
    if (isImporting) return "Importing..."
    if (!lastSync) return "Import All Emails"
    return "Import New Emails"
  }

  const getButtonDescription = () => {
    if (!lastSync) {
      return "Import emails from account creation date"
    }
    const lastSyncDate = new Date(lastSync)
    return `Import emails since ${lastSyncDate.toLocaleDateString()}`
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleImport} disabled={isImporting} className="w-full bg-transparent" variant="outline">
        {isImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
        {getButtonText()}
      </Button>
      <p className="text-xs text-muted-foreground text-center">{getButtonDescription()}</p>
      <p className="text-xs text-muted-foreground text-center">📧 Auto-sync runs every 15 minutes</p>
    </div>
  )
}
