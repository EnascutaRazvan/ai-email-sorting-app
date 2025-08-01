"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Download, CheckCircle, AlertCircle } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImportResult {
  success: boolean
  totalImported: number
  results: Array<{
    account: string
    processed?: number
    imported?: number
    error?: string
  }>
  message: string
}

export function EmailImportButton({ onImportComplete }: { onImportComplete?: () => void }) {
  const [isImporting, setIsImporting] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)

  const handleImportEmails = async () => {
    setIsImporting(true)
    setLastImportResult(null)

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setLastImportResult(result)
        showSuccessToast(
          "Emails Imported Successfully",
          `${result.totalImported} new emails have been imported and categorized`,
        )
        onImportComplete?.()
      } else {
        throw new Error(result.error || "Failed to import emails")
      }
    } catch (error) {
      console.error("Import error:", error)
      showErrorToast(error, "Email Import")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button
          onClick={handleImportEmails}
          disabled={isImporting}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          {isImporting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Importing & Categorizing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import New Emails
            </>
          )}
        </Button>
      </div>

      {lastImportResult && (
        <Alert
          className={`border-2 ${lastImportResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          {lastImportResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className="text-sm">
            <div className="font-medium mb-2">{lastImportResult.message}</div>
            {lastImportResult.results && lastImportResult.results.length > 0 && (
              <div className="space-y-1">
                {lastImportResult.results.map((result, index) => (
                  <div key={index} className="text-xs">
                    <strong>{result.account}:</strong>{" "}
                    {result.error ? (
                      <span className="text-red-600">{result.error}</span>
                    ) : (
                      <span className="text-green-600">Processed {result.processed || 0} emails</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          <strong>How it works:</strong> This will fetch recent emails from all your connected Gmail accounts, use AI to
          categorize and summarize them, then archive them in Gmail (they won't appear in your inbox anymore).
        </AlertDescription>
      </Alert>
    </div>
  )
}
