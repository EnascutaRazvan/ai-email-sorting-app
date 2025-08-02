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
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, Download, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface EmailImportDialogProps {
  accounts: Array<{ id: string; email: string }>
  onImportComplete: () => void
}

export function EmailImportDialog({ accounts, onImportComplete }: EmailImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()

  const handleImport = async () => {
    if (!selectedAccount) {
      showErrorToast("Please select an account", "Import Error")
      return
    }

    setIsImporting(true)

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount,
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast(
          "Import Complete",
          `Successfully imported ${data.imported} emails out of ${data.processed} processed`,
        )
        onImportComplete()
        setIsOpen(false)
        resetForm()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to import emails")
      }
    } catch (error) {
      showErrorToast(error, "Email Import")
    } finally {
      setIsImporting(false)
    }
  }

  const resetForm = () => {
    setSelectedAccount("")
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Download className="mr-2 h-4 w-4" />
          Import Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Import Emails</DialogTitle>
          <DialogDescription className="text-gray-600">
            Import emails from your connected Gmail accounts with optional date range filtering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Select Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an account to import from" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Date Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* From Date */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      disabled={(date) => date > new Date() || (dateTo && date > dateTo)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* To Date */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      disabled={(date) => date > new Date() || (dateFrom && date < dateFrom)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear Date Range */}
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom(undefined)
                  setDateTo(undefined)
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear date range
              </Button>
            )}
          </div>

          {/* Import Info */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">Import Details:</p>
            <ul className="text-xs space-y-1">
              <li>• Emails will be automatically categorized using AI</li>
              <li>• Duplicates will be skipped</li>
              <li>• Original emails will be archived in Gmail</li>
              {!dateFrom && !dateTo && <li>• All emails since account connection will be imported</li>}
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !selectedAccount}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import Emails
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
