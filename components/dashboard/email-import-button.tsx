"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface EmailImportButtonProps {
  accountId?: string
  accountEmail?: string
  onImportComplete?: () => void
}

export function EmailImportButton({ accountId, accountEmail, onImportComplete }: EmailImportButtonProps) {
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    if (!accountId) {
      toast.error("No account selected")
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        onImportComplete?.()
      } else {
        toast.error(data.error || "Failed to import emails")
      }
    } catch (error) {
      console.error("Import error:", error)
      toast.error("Failed to import emails")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Button onClick={handleImport} disabled={isImporting} size="sm" className="gap-2">
      {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isImporting ? "Importing..." : "Import Emails"}
    </Button>
  )
}
