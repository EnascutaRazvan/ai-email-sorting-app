"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, UserX, Mail, Calendar, User } from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"
import { toast } from "sonner"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  ai_summary: string
  received_at: string
  is_read: boolean
  category_id: string
  account_id: string
}

interface EmailListProps {
  emails: Email[]
  onEmailUpdate: () => void
  selectedCategory: string | null
}

export function EmailList({ emails, onEmailUpdate, selectedCategory }: EmailListProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState(null)
  const [showResults, setShowResults] = useState(false)

  // Reset selection when category changes
  useEffect(() => {
    setSelectedEmails(new Set())
  }, [selectedCategory])

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
    if (selectedEmails.size === 0) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete emails")
      }

      const result = await response.json()
      toast.success(`Successfully deleted ${result.deleted} emails`)
      setSelectedEmails(new Set())
      onEmailUpdate()
    } catch (error) {
      console.error("Error deleting emails:", error)
      toast.error("Failed to delete emails")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkUnsubscribe = async () => {
    if (selectedEmails.size === 0) return

    setIsUnsubscribing(true)
    try {
      const response = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailIds: Array.from(selectedEmails),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to process unsubscribe")
      }

      const result = await response.json()
      setUnsubscribeResults(result)
      setShowResults(true)
      toast.success(`Processed ${result.processed} emails, ${result.successful} successful unsubscribes`)
      setSelectedEmails(new Set())
      onEmailUpdate()
    } catch (error) {
      console.error("Error unsubscribing:", error)
      toast.error("Failed to process unsubscribe requests")
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isAllSelected = emails.length > 0 && selectedEmails.size === emails.length
  const isIndeterminate = selectedEmails.size > 0 && selectedEmails.size < emails.length

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No emails</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCategory ? "No emails found in this category." : "Import some emails to get started."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} aria-label="Select all emails" />
              <span>{selectedEmails.size > 0 ? `${selectedEmails.size} selected` : `${emails.length} emails`}</span>
            </CardTitle>
            {selectedEmails.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete Selected"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkUnsubscribe}
                  disabled={isUnsubscribing}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <UserX className="h-4 w-4" />
                  {isUnsubscribing ? "Unsubscribing..." : "Unsubscribe Selected"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`border rounded-lg p-4 transition-colors ${
                selectedEmails.has(email.id) ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedEmails.has(email.id)}
                  onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                  aria-label={`Select email from ${email.sender}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 truncate">{email.sender}</span>
                      {!email.is_read && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {formatDate(email.received_at)}
                    </div>
                  </div>
                  <h3
                    className="font-medium text-gray-900 mb-2 cursor-pointer hover:text-blue-600"
                    onClick={() => setSelectedEmail(email)}
                  >
                    {email.subject}
                  </h3>
                  {email.ai_summary && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                      <p className="text-sm text-blue-800">
                        <strong>AI Summary:</strong> {email.ai_summary}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-2">{email.snippet}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          open={!!selectedEmail}
          onOpenChange={(open) => !open && setSelectedEmail(null)}
        />
      )}

      {showResults && unsubscribeResults && (
        <UnsubscribeResultsDialog results={unsubscribeResults} open={showResults} onOpenChange={setShowResults} />
      )}
    </>
  )
}
