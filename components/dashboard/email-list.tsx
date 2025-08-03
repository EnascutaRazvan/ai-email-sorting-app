"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, Star, Trash2, Loader2, UnlinkIcon as Unsubscribe, Sparkles, Clock, User } from "lucide-react"
import { EmailFilters } from "./email-filters"
import { EmailDetailDialog } from "./email-detail-dialog"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { cn } from "@/lib/utils"

interface Email {
  id: string
  subject: string
  sender: string
  sender_name?: string
  received_at: string
  is_read: boolean
  is_starred: boolean
  is_archived: boolean
  category_id?: string
  category?: {
    id: string
    name: string
    color: string
  }
  account?: {
    id: string
    email: string
  }
  ai_summary?: string
  content_preview?: string
  snippet?: string
}

interface Category {
  id: string
  name: string
  color: string
  email_count: number
}

interface Account {
  id: string
  email: string
  name?: string
}

interface EmailListProps {
  selectedCategory: string | null
  searchQuery?: string
  accounts: Account[]
  categories: Category[]
  onEmailsChange: () => void
}

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  ai_summary: string
  details: Array<{
    link: { url: string; text: string; method: string }
    result: {
      success: boolean
      method: string
      error?: string
      details?: string
      screenshot?: string
    }
  }>
}

export function EmailList({
  selectedCategory,
  searchQuery = "",
  accounts,
  categories,
  onEmailsChange,
}: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [dateRange, setDateRange] = useState("all")
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState<UnsubscribeResult[]>([])
  const [isUnsubscribeDialogOpen, setIsUnsubscribeDialogOpen] = useState(false)
  const [totalProcessed, setTotalProcessed] = useState(0)
  const [totalSuccessful, setTotalSuccessful] = useState(0)

  // Use ref to prevent multiple simultaneous fetches
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const fetchEmails = useCallback(async () => {
    // Don't fetch if component is unmounted
    if (!mountedRef.current) {
      return
    }

    setIsLoading(true)

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const params = new URLSearchParams()

      if (selectedCategory && selectedCategory !== "all") {
        if (selectedCategory === "unread") {
          params.append("is_read", "false")
        } else if (selectedCategory === "starred") {
          params.append("is_starred", "true")
        } else if (selectedCategory === "archived") {
          params.append("is_archived", "true")
        } else if (selectedCategory === "uncategorized") {
          params.append("category", "uncategorized")
        } else {
          params.append("category", selectedCategory)
        }
      }

      if (searchQuery) {
        params.append("search", searchQuery)
      }

      if (selectedAccount) {
        params.append("account_id", selectedAccount)
      }

      if (dateRange !== "all") {
        params.append("date_range", dateRange)
      }

      params.append("sort_by", sortBy)
      params.append("sort_order", sortOrder)

      const response = await fetch(`/api/emails?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      })

      // Check if component is still mounted before updating state
      if (!mountedRef.current) {
        return
      }

      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
      } else {
        throw new Error("Failed to fetch emails")
      }
    } catch (error) {
      // Only show error if it's not an abort error and component is still mounted
      if (error instanceof Error && error.name !== "AbortError" && mountedRef.current) {
        console.error("Error fetching emails:", error)
        showErrorToast(error, "Fetching Emails")
      }
    } finally {
      // Only update loading state if component is still mounted
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [selectedCategory, searchQuery, selectedAccount, dateRange, sortBy, sortOrder])

  // Fetch emails when dependencies change
  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleEmailSelect = (emailId: string, checked: boolean) => {
    setSelectedEmails((prev) => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(emailId)
      } else {
        newSet.delete(emailId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(emails.map((email) => email.id)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email)
    setIsDetailDialogOpen(true)

    // Mark as read if not already
    if (!email.is_read) {
      handleMarkAsRead([email.id], true)
    }
  }

  const handleMarkAsRead = async (emailIds: string[], isRead: boolean) => {
    try {
      const response = await fetch("/api/emails/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds, updates: { is_read: isRead } }),
      })

      if (response.ok) {
        setEmails((prev) => prev.map((email) => (emailIds.includes(email.id) ? { ...email, is_read: isRead } : email)))
        onEmailsChange()
      } else {
        throw new Error("Failed to update emails")
      }
    } catch (error) {
      showErrorToast(error, "Update Emails")
    }
  }

  const handleMarkAsStarred = async (emailIds: string[], isStarred: boolean) => {
    try {
      const response = await fetch("/api/emails/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds, updates: { is_starred: isStarred } }),
      })

      if (response.ok) {
        setEmails((prev) =>
          prev.map((email) => (emailIds.includes(email.id) ? { ...email, is_starred: isStarred } : email)),
        )
        onEmailsChange()
      } else {
        throw new Error("Failed to update emails")
      }
    } catch (error) {
      showErrorToast(error, "Update Emails")
    }
  }

  const handleArchive = async (emailIds: string[]) => {
    try {
      const response = await fetch("/api/emails/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds, updates: { is_archived: true } }),
      })

      if (response.ok) {
        setEmails((prev) => prev.filter((email) => !emailIds.includes(email.id)))
        setSelectedEmails(new Set())
        showSuccessToast("Emails Archived", `${emailIds.length} email(s) archived successfully`)
        onEmailsChange()
      } else {
        throw new Error("Failed to archive emails")
      }
    } catch (error) {
      showErrorToast(error, "Archive Emails")
    }
  }

  const handleDelete = async (emailIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${emailIds.length} email(s)? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds }),
      })

      if (response.ok) {
        setEmails((prev) => prev.filter((email) => !emailIds.includes(email.id)))
        setSelectedEmails(new Set())
        showSuccessToast("Emails Deleted", `${emailIds.length} email(s) deleted successfully`)
        onEmailsChange()
      } else {
        throw new Error("Failed to delete emails")
      }
    } catch (error) {
      showErrorToast(error, "Delete Emails")
    }
  }

  const handleBulkUnsubscribe = async () => {
    if (selectedEmails.size === 0) {
      showErrorToast("No emails selected", "Bulk Unsubscribe")
      return
    }

    if (
      !confirm(
        `Are you sure you want to unsubscribe from ${selectedEmails.size} email(s)? This will attempt to automatically unsubscribe you from these senders.`,
      )
    ) {
      return
    }

    setIsUnsubscribing(true)
    try {
      const response = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (response.ok) {
        const data = await response.json()
        setUnsubscribeResults(data.results || [])
        setTotalProcessed(data.totalProcessed || 0)
        setTotalSuccessful(data.totalSuccessful || 0)
        setIsUnsubscribeDialogOpen(true)
        setSelectedEmails(new Set())
        onEmailsChange()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to unsubscribe from emails")
      }
    } catch (error) {
      showErrorToast(error, "Bulk Unsubscribe")
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return "Today"
    } else if (diffDays === 2) {
      return "Yesterday"
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "?"
  }

  const filteredEmails = emails

  if (isLoading) {
    return (
      <Card className="glass h-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            Loading Emails...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Fetching your emails...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Filters */}
      <EmailFilters
        searchQuery={searchQuery}
        onSearchChange={() => {}} // Handled by parent
        selectedCategory={selectedCategory}
        onCategoryChange={() => {}} // Handled by parent
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onAccountChange={setSelectedAccount}
        categories={categories}
        totalEmails={emails.length}
        filteredEmails={filteredEmails.length}
      />

      {/* Email List */}
      <Card className="glass flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5 text-primary" />
              Emails
              <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground">
                {filteredEmails.length}
              </Badge>
            </CardTitle>

            {/* Bulk Actions */}
            {selectedEmails.size > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {selectedEmails.size} selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkUnsubscribe}
                  disabled={isUnsubscribing}
                  className="text-orange-600 hover:text-orange-700 bg-transparent"
                >
                  {isUnsubscribing ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Unsubscribe className="mr-1 h-3 w-3" />
                  )}
                  Unsubscribe
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(Array.from(selectedEmails))}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Select All */}
          {filteredEmails.length > 0 && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                checked={selectedEmails.size === filteredEmails.length && filteredEmails.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select all {filteredEmails.length} emails</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 p-0">
          {filteredEmails.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No emails found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || selectedCategory !== "all" || selectedAccount || dateRange !== "all"
                    ? "Try adjusting your filters or search terms"
                    : "Connect your Gmail account to start importing emails"}
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-border">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={cn(
                      "group relative p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      !email.is_read && "bg-muted/30",
                      selectedEmails.has(email.id) && "bg-primary/10",
                    )}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        checked={selectedEmails.has(email.id)}
                        onCheckedChange={(checked) => handleEmailSelect(email.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />

                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src="/placeholder.svg" alt={email.sender_name || email.sender} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(email.sender_name, email.sender)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <p
                              className={cn(
                                "text-sm truncate",
                                email.is_read ? "text-muted-foreground" : "text-foreground font-medium",
                              )}
                            >
                              {email.sender_name || email.sender}
                            </p>
                            {email.account && (
                              <Badge variant="outline" className="text-xs">
                                {email.account.email}
                              </Badge>
                            )}
                            {email.category && (
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: `${email.category.color}20`,
                                  color: email.category.color,
                                  borderColor: `${email.category.color}40`,
                                }}
                              >
                                {email.category.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">{formatDate(email.received_at)}</span>
                            {email.is_starred && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                            {!email.is_read && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p
                            className={cn(
                              "text-sm truncate",
                              email.is_read ? "text-muted-foreground" : "text-foreground font-medium",
                            )}
                          >
                            {email.subject}
                          </p>

                          {/* AI Summary */}
                          {email.ai_summary && (
                            <div className="bg-primary/5 rounded-md p-2 border border-primary/10">
                              <div className="flex items-center mb-1">
                                <Sparkles className="h-3 w-3 text-primary mr-1" />
                                <span className="text-xs font-medium text-primary">AI Summary</span>
                              </div>
                              <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{email.ai_summary}</p>
                            </div>
                          )}

                          {/* Content Preview */}
                          {(email.content_preview || email.snippet) && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {email.content_preview || email.snippet}
                            </p>
                          )}

                          {/* Email metadata */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3" />
                              <span className="truncate">{email.account?.email || "Unknown account"}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {new Date(email.received_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <EmailDetailDialog
        email={selectedEmail}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        onEmailUpdate={(updatedEmail) => {
          setEmails((prev) => prev.map((email) => (email.id === updatedEmail.id ? updatedEmail : email)))
          onEmailsChange()
        }}
        categories={categories}
      />

      {/* Unsubscribe Results Dialog */}
      <UnsubscribeResultsDialog
        isOpen={isUnsubscribeDialogOpen}
        onClose={() => setIsUnsubscribeDialogOpen(false)}
        results={unsubscribeResults}
        totalProcessed={totalProcessed}
        totalSuccessful={totalSuccessful}
      />
    </div>
  )
}
