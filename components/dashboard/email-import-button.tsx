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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2, MailPlus } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface EmailImportButtonProps {
  accounts: Array<{ id: string; email: string }>
  onImportComplete: () => void
}

export function EmailImportButton({ accounts, onImportComplete }: EmailImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined)
  const [maxEmails, setMaxEmails] = useState(50)
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async () => {
    if (!selectedAccountId) {
      showErrorToast("Please select an account to import emails from.", "Import Emails")
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId, maxEmails }),
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast("Import Complete", `Successfully imported ${data.importedCount} emails.`)
        onImportComplete()
        setIsOpen(false)
      } else {
        throw new Error("Failed to import emails")
      }
    } catch (error) {
      showErrorToast(error, "Import Emails")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-transparent text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        >
          <MailPlus className="h-4 w-4" />
          Import Emails
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Import Emails</DialogTitle>
          <DialogDescription>Select an account and the number of emails to import.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account" className="text-right text-foreground">
              Account
            </Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger
                id="account"
                className="col-span-3 bg-background text-foreground border-border focus:ring-primary"
              >
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground">
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="max-emails" className="text-right text-foreground">
              Max Emails
            </Label>
            <Input
              id="max-emails"
              type="number"
              value={maxEmails}
              onChange={(e) => setMaxEmails(Number(e.target.value))}
              className="col-span-3 bg-background text-foreground border-border focus-visible:ring-primary"
              min={1}
              max={200} // Arbitrary max limit for a single import
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleImport} disabled={isImporting || !selectedAccountId}>
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
