"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Mail, Trash2, Unlink, RefreshCw, User, Calendar } from "lucide-react"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  category_name: string
  category_color: string
  ai_summary: string
  received_at: string
  is_read: boolean
}

interface EmailListProps {
  selectedCategory: string | null
}

export function EmailList({ selectedCategory }: EmailListProps) {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchEmails()
  }, [session, selectedCategory])

  const fetchEmails = async () => {
    if (!session?.user?.id) return

    try {
      const url = selectedCategory ? `/api/emails?category=${selectedCategory}` : "/api/emails"

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails)
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
    } finally {
      setIsLoading(false)
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
    if (selectedEmails.size === 0) return

    setIsProcessing(true)
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

      if (response.ok) {
        setEmails(emails.filter((email) => !selectedEmails.has(email.id)))
        setSelectedEmails(new Set())
      }
    } catch (error) {
      console.error("Error deleting emails:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkUnsubscribe = async () => {
    if (selectedEmails.size === 0) return

    setIsProcessing(true)
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

      if (response.ok) {
        // Refresh the email list
        fetchEmails()
        setSelectedEmails(new Set())
      }
    } catch (error) {
      console.error("Error unsubscribing:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      // Trigger email processing
      await fetch("/api/emails/process", { method: "POST" })
      // Refresh the list
      await fetchEmails()
    } catch (error) {
      console.error("Error refreshing emails:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Email List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            Email List
            <Badge variant="secondary" className="ml-2">
              {emails.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {selectedEmails.size > 0 && (
          <div className="flex items-center space-x-2 pt-4 border-t">
            <span className="text-sm text-gray-600 dark:text-gray-400">{selectedEmails.size} selected</span>
            <Button onClick={handleBulkDelete} variant="destructive" size="sm" disabled={isProcessing}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button onClick={handleBulkUnsubscribe} variant="outline" size="sm" disabled={isProcessing}>
              <Unlink className="mr-2 h-4 w-4" />
              Unsubscribe
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {emails.length > 0 && (
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox checked={selectedEmails.size === emails.length} onCheckedChange={handleSelectAll} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Select all</span>
          </div>
        )}

        {emails.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">No emails found</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {selectedCategory
                ? "No emails in this category yet."
                : "Connect your Gmail account and refresh to see your emails."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedEmails.has(email.id)
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                    : "hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={selectedEmails.has(email.id)}
                    onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <h4 className={`font-medium truncate ${!email.is_read ? "font-semibold" : ""}`}>
                          {email.subject}
                        </h4>
                        {!email.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                      </div>
                      <div className="flex items-center space-x-2">
                        {email.category_name && (
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: `${email.category_color}20`, color: email.category_color }}
                          >
                            {email.category_name}
                          </Badge>
                        )}
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="mr-1 h-3 w-3" />
                          {new Date(email.received_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <User className="mr-1 h-3 w-3" />
                      {email.sender}
                    </div>

                    {email.ai_summary && (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 mb-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>AI Summary:</strong> {email.ai_summary}
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{email.snippet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
