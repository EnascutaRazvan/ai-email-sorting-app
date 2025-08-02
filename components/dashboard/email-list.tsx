"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Mail, Clock, RefreshCw, Trash2, UserX } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { EmailDetailDialog } from "./email-detail-dialog"
import type { EmailFilters as EmailFiltersType } from "./email-filters"
import { Checkbox } from "@/components/ui/checkbox"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"

interface EmailCategory {
  id: string
  name: string
  color: string
  is_ai_suggested: boolean
  confidence_score?: number
}

interface Email {
  id: string
  subject: string
  sender: string
  sender_email: string
  snippet: string
  ai_summary: string
  received_at: string
  is_read: boolean
  categories: EmailCategory[]
  account: {
    id: string
    email: string
    name?: string
    picture?: string
  }
}

interface EmailListProps {
  selectedCategories: string[]
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
  details: any[]
}

export function EmailList({ selectedCategories, accounts, categories, onEmailsChange }: EmailListProps) {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filters, setFilters] = useState<EmailFiltersType>({
    search: "",
    categoryIds: selectedCategories,
    accountId: null,
    dateFrom: null,
    dateTo: null,
    sender: "",
    senderEmail: "",
  })

  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState<UnsubscribeResult[]>([])
  const [isUnsubscribeDialogOpen, setIsUnsubscribeDialogOpen] = useState(false)
  const [unsubscribeStats, setUnsubscribeStats] = useState({ processed: 0, successful: 0 })

  useEffect(() => {
    if (session?.user?.id) {
      fetchEmails()
    }
  }, [session, filters, pagination.page, pagination.limit])

  useEffect(() => {
    setFilters((prev) => ({ ...prev, categoryIds: selectedCategories }))
  }, [selectedCategories])

  useEffect(() => {
    const handleAccountRemoved = (event: CustomEvent) => {
      const { accountId } = event.detail
      setEmails((prevEmails) => prevEmails.filter((email) => email.account.id !== accountId))
      setFilters((prevFilters) => ({
        ...prevFilters,
        accountId: prevFilters.accountId === accountId ? null : prevFilters.accountId,
      }))
      setPagination((prev) => ({ ...prev, page: 1 }))
      fetchEmails()
    }
    window.addEventListener("accountRemoved", handleAccountRemoved as EventListener)
    return () => window.removeEventListener("accountRemoved", handleAccountRemoved as EventListener)
  }, [])

  const fetchEmails = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", pagination.page.toString())
      params.append("limit", pagination.limit.toString())

      if (filters.search) params.append("search", filters.search)
      if (filters.categoryIds.length > 0) params.append("categories", filters.categoryIds.join(","))
      if (filters.accountId) params.append("account", filters.accountId)
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.append("dateTo", filters.dateTo.toISOString())
      if (filters.sender) params.append("sender", filters.sender)
      if (filters.senderEmail) params.append("senderEmail", filters.senderEmail)

      const response = await fetch(`/api/emails?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }))
      } else {
        throw new Error("Failed to fetch emails")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Emails")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecategorizeEmails = async () => {
    // Implementation from previous steps
  }

  const handleEmailClick = (emailId: string) => {
    if (isUnsubscribing || isDeleting) return
    setSelectedEmailId(emailId)
    setIsDetailDialogOpen(true)
  }

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false)
    setSelectedEmailId(null)
    fetchEmails()
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
        fetchEmails()
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
        showSuccessToast(
          "Unsubscribe Agent Finished",
          `Processed ${data.processed} emails, ${data.successful} successful unsubscribes.`,
        )
        setUnsubscribeResults(data.results)
        setUnsubscribeStats({ processed: data.processed, successful: data.successful })
        setIsUnsubscribeDialogOpen(true)
        setSelectedEmails(new Set())
        fetchEmails()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process unsubscribe requests")
      }
    } catch (error) {
      showErrorToast(error, "Bulk Unsubscribe")
    } finally {
      setIsUnsubscribing(false)
    }
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

    if (diffDays <= 1) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading emails...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
              <Mail className="mr-2 h-4 w-4 text-blue-600" />
              Emails
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
                {emails.length}
              </Badge>
              {selectedEmails.size > 0 && (
                <Badge variant="default" className="ml-2 bg-blue-600 text-white text-xs">
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
                    disabled={isDeleting || isUnsubscribing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent flex items-center gap-1"
                  >
                    {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </Button>
                  <Button
                    onClick={handleBulkUnsubscribe}
                    variant="outline"
                    size="sm"
                    disabled={isUnsubscribing || isDeleting}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 bg-transparent flex items-center gap-1"
                  >
                    {isUnsubscribing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                    Unsubscribe
                  </Button>
                </>
              )}
              <Button onClick={fetchEmails} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {emails.length > 0 && (
            <div className="flex items-center space-x-2 pt-2 border-t mt-2">
              <Checkbox
                checked={selectedEmails.size > 0 && selectedEmails.size === emails.length}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-blue-600"
              />
              <span className="text-sm text-gray-600">Select all ({emails.length} emails)</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0">
          {emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails found</h3>
              <p className="text-sm text-gray-600 max-w-sm">
                Try adjusting your filters or import emails from your connected Gmail accounts
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1 p-4">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email.id)}
                    className={`group relative p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-200 ${
                      selectedEmails.has(email.id)
                        ? "bg-blue-50 border-blue-300"
                        : email.is_read
                          ? "bg-white/50 border-gray-200/50"
                          : "bg-gradient-to-r from-blue-50/50 to-white border-blue-200/50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center space-x-3 pt-1">
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage
                            src={email.account.picture || "/placeholder.svg"}
                            alt={getSenderName(email.sender)}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-sm">
                            {getSenderInitials(email.sender)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p
                            className={`text-sm truncate ${email.is_read ? "text-gray-700" : "font-semibold text-gray-900"}`}
                          >
                            {getSenderName(email.sender)}
                          </p>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(email.received_at)}
                          </div>
                        </div>
                        <h3
                          className={`text-sm mb-2 line-clamp-1 ${email.is_read ? "text-gray-800" : "font-semibold text-gray-900"}`}
                        >
                          {email.subject}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{email.snippet}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <EmailDetailDialog emailId={selectedEmailId} isOpen={isDetailDialogOpen} onClose={handleCloseDetailDialog} />
      <UnsubscribeResultsDialog
        isOpen={isUnsubscribeDialogOpen}
        onClose={() => setIsUnsubscribeDialogOpen(false)}
        results={unsubscribeResults}
        totalProcessed={unsubscribeStats.processed}
        totalSuccessful={unsubscribeStats.successful}
      />
    </TooltipProvider>
  )
}
