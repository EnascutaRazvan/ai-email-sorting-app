"use client"

import { cn } from "@/lib/utils"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mail, Clock, User, Sparkles, RefreshCw, MailOpen, Archive, Bot, Trash2, UserX } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { EmailDetailDialog } from "./email-detail-dialog"
import { EmailFilters, type EmailFilters as EmailFiltersType } from "./email-filters"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"
import { Checkbox } from "@/components/ui/checkbox"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  ai_summary: string
  received_at: string
  is_read: boolean
  category?: {
    id: string
    name: string
    color: string
  }
  account?: {
    email: string
    name?: string
  }
  suggested_category?: {
    id: string
    name: string
    color: string
  }
}

interface EmailListProps {
  selectedCategory: string | null
  accounts: Array<{ id: string; email: string }>
  categories: Array<{ id: string; name: string; color: string }>
  onEmailsChange?: () => void
}

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
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

export function EmailList({ selectedCategory, accounts, categories, onEmailsChange }: EmailListProps) {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [filters, setFilters] = useState<EmailFiltersType>({
    search: "",
    categoryId: selectedCategory,
    accountId: null,
    dateFrom: null,
    dateTo: null,
    sender: "",
  })

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState<UnsubscribeResult[]>([])
  const [showUnsubscribeResults, setShowUnsubscribeResults] = useState(false)
  const [unsubscribeStats, setUnsubscribeStats] = useState({ processed: 0, successful: 0 })

  // Use ref to prevent multiple simultaneous fetches
  const fetchingRef = useRef(false)
  const initialFetchDone = useRef(false)

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchEmails = useCallback(async () => {
    if (fetchingRef.current || !session?.user?.id) return

    fetchingRef.current = true
    try {
      const response = await fetch("/api/emails")
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
        setFilteredEmails(data.emails || [])
        initialFetchDone.current = true
      } else {
        throw new Error("Failed to fetch emails")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Emails")
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [session?.user?.id])

  // Memoized fetch with filters function
  const fetchEmailsWithFilters = useCallback(async () => {
    if (!session?.user?.id || fetchingRef.current) return

    fetchingRef.current = true
    try {
      const params = new URLSearchParams()

      if (filters.search) params.append("search", filters.search)
      if (filters.categoryId && filters.categoryId !== "all") params.append("category", filters.categoryId)
      if (filters.accountId && filters.accountId !== "all") params.append("account", filters.accountId)
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.append("dateTo", filters.dateTo.toISOString())
      if (filters.sender) params.append("sender", filters.sender)

      const response = await fetch(`/api/emails?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setFilteredEmails(data.emails || [])
      } else {
        throw new Error("Failed to fetch filtered emails")
      }
    } catch (error) {
      showErrorToast(error, "Filtering Emails")
    } finally {
      fetchingRef.current = false
    }
  }, [session?.user?.id, filters])

  // Initial fetch only once when session is available
  useEffect(() => {
    if (session?.user?.id && !initialFetchDone.current) {
      fetchEmails()
    }
  }, [session?.user?.id, fetchEmails])

  // Update filters when selectedCategory changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, categoryId: selectedCategory }))
  }, [selectedCategory])

  // Fetch with filters when filters change (but not on initial load)
  useEffect(() => {
    if (initialFetchDone.current) {
      fetchEmailsWithFilters()
    }
  }, [filters, fetchEmailsWithFilters])

  const handleRecategorizeEmails = async () => {
    setIsRecategorizing(true)

    try {
      // Ensure uncategorized category exists
      await fetch("/api/categories/ensure-uncategorized", { method: "POST" })

      // Get all email IDs for recategorization
      const emailIds = filteredEmails.map((email) => email.id)

      const response = await fetch("/api/emails/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds }),
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast("AI Recategorization Complete", `Updated ${data.updated} emails with AI suggestions`)
        fetchEmailsWithFilters()
        onEmailsChange?.()
      } else {
        throw new Error("Failed to recategorize emails")
      }
    } catch (error) {
      showErrorToast(error, "AI Recategorization")
    } finally {
      setIsRecategorizing(false)
    }
  }

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId)
    setIsDetailDialogOpen(true)
  }

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false)
    setSelectedEmailId(null)
    fetchEmailsWithFilters()
  }

  const getSenderInitials = (sender: string) => {
    const match = sender.match(/^([^<]+)/)
    const name = match ? match[1].trim() : sender
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getSenderName = (sender: string) => {
    const match = sender.match(/^([^<]+)/)
    return match ? match[1].trim() : sender
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
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
      setSelectedEmails(new Set(filteredEmails.map((email) => email.id)))
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (response.ok) {
        showSuccessToast("Emails Deleted", `Successfully deleted ${selectedEmails.size} emails`)
        setSelectedEmails(new Set())
        fetchEmailsWithFilters()
        onEmailsChange?.()
      } else {
        throw new Error("Failed to delete emails")
      }
    } catch (error) {
      showErrorToast(error, "Deleting Emails")
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (response.ok) {
        const data = await response.json()
        setUnsubscribeResults(data.results)
        setUnsubscribeStats({ processed: data.processed, successful: data.successful })
        setShowUnsubscribeResults(true)
        setSelectedEmails(new Set())
        fetchEmailsWithFilters()
        showSuccessToast(
          "Unsubscribe Complete",
          `Processed ${data.processed} emails, ${data.successful} successful unsubscribes`,
        )
      } else {
        throw new Error("Failed to process unsubscribe requests")
      }
    } catch (error) {
      showErrorToast(error, "Bulk Unsubscribe")
    } finally {
      setIsUnsubscribing(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="glass h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading emails...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="glass h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground flex items-center">
              <Mail className="mr-2 h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Emails</span>
              <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground text-xs">
                {filteredEmails.length}
              </Badge>
              {selectedEmails.size > 0 && (
                <Badge variant="default" className="ml-2 bg-primary text-primary-foreground text-xs">
                  {selectedEmails.size} selected
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              {selectedEmails.size > 0 && (
                <>
                  <Button
                    onClick={handleBulkDelete}
                    variant="outline"
                    size="sm"
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-background border-border"
                  >
                    {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="hidden sm:inline ml-1">Delete</span>
                  </Button>
                  <Button
                    onClick={handleBulkUnsubscribe}
                    variant="outline"
                    size="sm"
                    disabled={isUnsubscribing}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950 bg-background border-border"
                  >
                    {isUnsubscribing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                    <span className="hidden sm:inline ml-1">{isUnsubscribing ? "Processing..." : "Unsubscribe"}</span>
                  </Button>
                </>
              )}
              <Button
                onClick={fetchEmailsWithFilters}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Selection Controls */}
          {filteredEmails.length > 0 && (
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                checked={selectedEmails.size === filteredEmails.length}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm text-muted-foreground">Select all ({filteredEmails.length} emails)</span>
            </div>
          )}

          {/* Email Filters */}
          <EmailFilters
            onFiltersChange={setFilters}
            accounts={accounts}
            categories={categories}
            onRecategorize={handleRecategorizeEmails}
            isRecategorizing={isRecategorizing}
          />
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No emails found</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Try adjusting your filters or import emails from your connected Gmail accounts
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1 p-4">
                {filteredEmails.map((email) => (
                  <div
                    key={email.id}
                    className={cn(
                      "group relative p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md animate-fade-in",
                      selectedEmails.has(email.id)
                        ? "bg-primary/5 border-primary/20"
                        : email.is_read
                          ? "bg-card border-border hover:border-border/80"
                          : "bg-card border-primary/20 hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src="/placeholder.svg" alt={getSenderName(email.sender)} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                            {getSenderInitials(email.sender)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0" onClick={() => handleEmailClick(email.id)}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-sm truncate",
                                email.is_read ? "text-muted-foreground" : "font-semibold text-foreground",
                              )}
                            >
                              {getSenderName(email.sender)}
                            </p>

                            {/* Account Label */}
                            {email.account && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-muted text-muted-foreground border-border"
                                  >
                                    {email.account.email.split("@")[0]}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Account: {email.account.email}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Category Labels */}
                            {email.category && (
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: `${email.category.color}15`,
                                  color: email.category.color,
                                  borderColor: `${email.category.color}30`,
                                }}
                                className="text-xs border"
                              >
                                {email.category.name}
                              </Badge>
                            )}

                            {/* AI Suggested Category */}
                            {email.suggested_category && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="secondary"
                                    style={{
                                      backgroundColor: `${email.suggested_category.color}10`,
                                      color: email.suggested_category.color,
                                      borderColor: `${email.suggested_category.color}20`,
                                    }}
                                    className="text-xs border border-dashed flex items-center gap-1"
                                  >
                                    <Bot className="h-3 w-3" />
                                    {email.suggested_category.name}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Suggested category by AI: {email.suggested_category.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(email.received_at)}
                            </div>
                            {!email.is_read && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                          </div>
                        </div>

                        <h3
                          className={cn(
                            "text-sm mb-2 line-clamp-1",
                            email.is_read ? "text-foreground" : "font-semibold text-foreground",
                          )}
                        >
                          {email.subject}
                        </h3>

                        {/* AI Summary */}
                        {email.ai_summary && (
                          <div className="bg-primary/5 rounded-md p-2 mb-2 border border-primary/10">
                            <div className="flex items-center mb-1">
                              <Sparkles className="h-3 w-3 text-primary mr-1" />
                              <span className="text-xs font-medium text-primary">AI Summary</span>
                            </div>
                            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{email.ai_summary}</p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{email.snippet}</p>

                        {/* Email metadata */}
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3" />
                            <span className="truncate">{email.account?.email || "Unknown account"}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {email.is_read ? <MailOpen className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                            <Archive className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <EmailDetailDialog emailId={selectedEmailId} isOpen={isDetailDialogOpen} onClose={handleCloseDetailDialog} />

      {/* Unsubscribe Results Dialog */}
      <UnsubscribeResultsDialog
        isOpen={showUnsubscribeResults}
        onClose={() => setShowUnsubscribeResults(false)}
        results={unsubscribeResults}
        totalProcessed={unsubscribeStats.processed}
        totalSuccessful={unsubscribeStats.successful}
      />
    </TooltipProvider>
  )
}
