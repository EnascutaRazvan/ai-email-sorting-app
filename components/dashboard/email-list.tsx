"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Mail, MailX, Loader2 } from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"
import { toast } from "sonner"

interface Email {
  id: string
  subject: string
  sender: string
  date: string
  summary: string
  category_id: string
  category_name: string
  content?: string
}

interface EmailListProps {
  categoryId?: string
}

export function EmailList({ categoryId }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [unsubscribeResults, setUnsubscribeResults] = useState<any>(null)

  useEffect(() => {
    fetchEmails()
  }, [categoryId])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      const url = categoryId ? `/api/emails?categoryId=${categoryId}` : "/api/emails"
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEmails(data)
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
      toast.error("Failed to fetch emails")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails)
    if (checked) {
      newSelected.add(emailId)
    } else {
      newSelected.delete(emailId)
    }
    setSelectedEmails(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(emails.map((email) => email.id)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      toast.error("No emails selected")
      return
    }

    setBulkActionLoading(true)
    try {
      const response = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Successfully deleted ${result.deletedCount} emails`)
        setSelectedEmails(new Set())
        fetchEmails()
      } else {
        throw new Error("Failed to delete emails")
      }
    } catch (error) {
      console.error("Error deleting emails:", error)
      toast.error("Failed to delete emails")
    } finally {
      setBulkActionLoading(false)
    }
  }

  const handleBulkUnsubscribe = async () => {
    if (selectedEmails.size === 0) {
      toast.error("No emails selected")
      return
    }

    setBulkActionLoading(true)
    try {
      const response = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (response.ok) {
        const results = await response.json()
        setUnsubscribeResults(results)
        toast.success(`Processed ${selectedEmails.size} emails for unsubscribe`)
        setSelectedEmails(new Set())
      } else {
        throw new Error("Failed to process unsubscribe")
      }
    } catch (error) {
      console.error("Error processing unsubscribe:", error)
      toast.error("Failed to process unsubscribe")
    } finally {
      setBulkActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {emails.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-4">
            <Checkbox checked={selectedEmails.size === emails.length} onCheckedChange={handleSelectAll} />
            <span className="text-sm text-muted-foreground">
              {selectedEmails.size > 0
                ? `${selectedEmails.size} of ${emails.length} selected`
                : `Select all ${emails.length} emails`}
            </span>
          </div>

          {selectedEmails.size > 0 && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleBulkDelete} disabled={bulkActionLoading}>
                {bulkActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Selected
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkUnsubscribe} disabled={bulkActionLoading}>
                {bulkActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MailX className="h-4 w-4 mr-2" />
                )}
                Unsubscribe Selected
              </Button>
            </div>
          )}
        </div>
      )}

      {emails.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No emails found</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => (
            <Card
              key={email.id}
              className={`cursor-pointer transition-colors ${
                selectedEmails.has(email.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <Checkbox
                      checked={selectedEmails.has(email.id)}
                      onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1" onClick={() => setSelectedEmail(email)}>
                      <CardTitle className="text-lg">{email.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">From: {email.sender}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{email.category_name}</Badge>
                    <span className="text-sm text-muted-foreground">{new Date(email.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent onClick={() => setSelectedEmail(email)}>
                <p className="text-sm text-muted-foreground line-clamp-2">{email.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          open={!!selectedEmail}
          onOpenChange={(open) => !open && setSelectedEmail(null)}
        />
      )}

      {unsubscribeResults && (
        <UnsubscribeResultsDialog
          results={unsubscribeResults}
          open={!!unsubscribeResults}
          onOpenChange={(open) => !open && setUnsubscribeResults(null)}
        />
      )}
    </div>
  )
}
