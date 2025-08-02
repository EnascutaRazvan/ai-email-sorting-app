"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface Account {
  id: string
  email: string
  name?: string
}

interface EmailImportButtonProps {
  accounts: Account[]
  onImportComplete: () => void
}

export function EmailImportButton({ accounts, onImportComplete }: EmailImportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()

  const handleImportEmails = async () => {
    if (!selectedAccountId) {
      toast({
        title: "Error",
        description: "Please select an account to import emails from.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    toast({
      title: "Importing Emails",
      description: "Starting email import. This may take a while depending on the number of emails.",
    })

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccountId, maxResults: 50 }), // Import last 50 emails
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to import emails")
      }

      const data = await response.json()
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.importedCount} emails.`,
      })
      onImportComplete() // Notify parent to refresh email list
      setIsDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import emails.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)} disabled={accounts.length === 0}>
        <Plus className="mr-2 h-4 w-4" />
        Import Emails
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Emails</DialogTitle>
            <DialogDescription>Select an account to import recent emails from.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-select">Select Account</Label>
              <Select onValueChange={setSelectedAccountId} value={selectedAccountId || ""}>
                <SelectTrigger id="account-select">
                  <SelectValue placeholder="Choose an account" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImportEmails} disabled={isImporting || !selectedAccountId}>
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
