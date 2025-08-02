"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Mail,
  Clock,
  User,
  Sparkles,
  RefreshCw,
  MailOpen,
  Archive,
  Bot,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AtSign,
} from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import { EmailDetailDialog } from "./email-detail-dialog"
import { EmailFilters, type EmailFilters as EmailFiltersType } from "./email-filters"

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

export function EmailList({ selectedCategories, accounts, categories, onEmailsChange }: EmailListProps) {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [filters, setFilters] = useState<EmailFiltersType>({
    search: "",
    categoryIds: selectedCategories,
    accountId: null,
    dateFrom: null,
    dateTo: null,
    sender: "",
    senderEmail: "",
  })

  useEffect(() => {
    if (session?.user?.id) {
      fetchEmails()
    }
  }, [session, filters, pagination.page, pagination.limit])

  useEffect(() => {
    setFilters((prev) => ({ ...prev, categoryIds: selectedCategories }))
  }, [selectedCategories])

  // Listen for account removal events
  useEffect(() => {
    const handleAccountRemoved = (event: CustomEvent) => {
      const { accountId } = event.detail
      // Filter out emails from the removed account
      setEmails((prevEmails) => prevEmails.filter((email) => email.account.id !== accountId))
      // Reset pagination if needed
      if (emails.length <= pagination.limit) {
        setPagination((prev) => ({ ...prev, page: 1 }))
      }
    }

    window.addEventListener("accountRemoved", handleAccountRemoved as EventListener)
    return () => window.removeEventListener("accountRemoved", handleAccountRemoved as EventListener)
  }, [emails.length, pagination.limit])

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
    setIsRecategorizing(true)

    try {
      // Ensure uncategorized category exists
      await fetch("/api/categories/ensure-uncategorized", { method: "POST" })

      // Get all email IDs for recategorization
      const emailIds = emails.map((email) => email.id)

      const response = await fetch("/api/emails/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds }),
      })

      if (response.ok) {
        const data = await response.json()
        showSuccessToast("AI Recategorization Complete", `Updated ${data.updated} emails with AI suggestions`)
        fetchEmails()
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
    fetchEmails()
  }

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }))
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

  const getSenderEmail = (sender: string) => {
    const match = sender.match(/<([^>]+)>/)
    return match ? match[1] : sender
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

  const getAccountDisplayName = (account: Email["account"]) => {
    return account.email.split("@")[0]
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
                {pagination.total}
              </Badge>
            </CardTitle>
            <Button onClick={fetchEmails} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Email Filters */}
          <EmailFilters
            onFiltersChange={setFilters}
            accounts={accounts}
            categories={categories}
            onRecategorize={handleRecategorizeEmails}
            isRecategorizing={isRecategorizing}
          />
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
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
            <>
              <ScrollArea className="flex-1">
                <div className="space-y-1 p-4">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email.id)}
                      className={`group relative p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-200 ${
                        email.is_read
                          ? "bg-white/50 border-gray-200/50"
                          : "bg-gradient-to-r from-blue-50/50 to-white border-blue-200/50"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage
                            src={email.account.picture || "/placeholder.svg"}
                            alt={getSenderName(email.sender)}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-sm">
                            {getSenderInitials(email.sender)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <p
                                className={`text-sm truncate ${email.is_read ? "text-gray-700" : "font-semibold text-gray-900"}`}
                              >
                                {getSenderName(email.sender)}
                              </p>

                              {/* Account Label */}
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center"
                                  >
                                    <AtSign className="h-3 w-3 mr-1" />
                                    {getAccountDisplayName(email.account)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Account: {email.account.email}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(email.received_at)}
                              </div>
                              {!email.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                            </div>
                          </div>

                          <h3
                            className={`text-sm mb-2 line-clamp-1 ${email.is_read ? "text-gray-800" : "font-semibold text-gray-900"}`}
                          >
                            {email.subject}
                          </h3>

                          {/* Categories */}
                          {email.categories && email.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {email.categories.map((category) => (
                                <Badge
                                  key={category.id}
                                  variant="secondary"
                                  style={{
                                    backgroundColor: `${category.color}15`,
                                    color: category.color,
                                    borderColor: `${category.color}30`,
                                  }}
                                  className={`text-xs border ${category.is_ai_suggested ? "border-dashed" : ""} flex items-center`}
                                >
                                  {category.is_ai_suggested && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Bot className="h-3 w-3 mr-1" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>AI suggested category</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {category.name}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* AI Summary */}
                          {email.ai_summary && (
                            <div className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-md p-2 mb-2 border border-purple-100/50">
                              <div className="flex items-center mb-1">
                                <Sparkles className="h-3 w-3 text-purple-600 mr-1" />
                                <span className="text-xs font-medium text-purple-900">AI Summary</span>
                              </div>
                              <p className="text-xs text-purple-800 line-clamp-2 leading-relaxed">{email.ai_summary}</p>
                            </div>
                          )}

                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{email.snippet}</p>

                          {/* Email metadata */}
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3" />
                              <span className="truncate">{getSenderEmail(email.sender)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {email.is_read ? <MailOpen className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                              <Archive className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-blue-50/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-white/50">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} emails
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-700">Per page:</span>
                      <select
                        value={pagination.limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="text-sm border rounded px-2 py-1 bg-white"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <span className="text-sm text-gray-700 px-3">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <EmailDetailDialog emailId={selectedEmailId} isOpen={isDetailDialogOpen} onClose={handleCloseDetailDialog} />
    </TooltipProvider>
  )
}
