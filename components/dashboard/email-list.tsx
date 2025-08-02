"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mail, MailOpen, Archive, Bot, User, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { EmailDetailDialog } from "./email-detail-dialog"
import { EmailPagination } from "./email-pagination"
import { toast } from "sonner"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  received_at: string
  is_read: boolean
  is_archived: boolean
  category?: {
    id: string
    name: string
    color: string
  }
  suggested_category?: {
    id: string
    name: string
    color: string
  }
  account?: {
    id: string
    email: string
    name?: string
  }
}

interface EmailListProps {
  categoryId: string | null
  accountId: string | null
  searchQuery: string
  readFilter: string
  refreshTrigger: number
}

export function EmailList({ categoryId, accountId, searchQuery, readFilter, refreshTrigger }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [emailsPerPage, setEmailsPerPage] = useState(10)
  const [totalEmails, setTotalEmails] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    loadEmails()
  }, [categoryId, accountId, searchQuery, readFilter, currentPage, emailsPerPage, refreshTrigger])

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [categoryId, accountId, searchQuery, readFilter])

  useEffect(() => {
    // Listen for account deletion events
    const handleAccountDeleted = (event: CustomEvent) => {
      const deletedAccountId = event.detail.accountId
      setEmails((prev) => prev.filter((email) => email.account?.id !== deletedAccountId))
    }

    window.addEventListener("accountDeleted", handleAccountDeleted as EventListener)
    return () => {
      window.removeEventListener("accountDeleted", handleAccountDeleted as EventListener)
    }
  }, [])

  const loadEmails = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: emailsPerPage.toString(),
      })

      if (categoryId && categoryId !== "all") {
        params.append("categoryId", categoryId)
      }
      if (accountId && accountId !== "all") {
        params.append("accountId", accountId)
      }
      if (searchQuery) {
        params.append("search", searchQuery)
      }
      if (readFilter && readFilter !== "all") {
        params.append("isRead", readFilter)
      }

      const response = await fetch(`/api/emails?${params}`)
      if (!response.ok) throw new Error("Failed to load emails")

      const data = await response.json()
      setEmails(data.emails)
      setTotalEmails(data.pagination.total)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error("Error loading emails:", error)
      toast.error("Failed to load emails")
    } finally {
      setIsLoading(false)
    }
  }

  const updateEmailStatus = async (emailId: string, updates: Partial<Email>) => {
    try {
      const response = await fetch("/api/emails", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailId, updates }),
      })

      if (!response.ok) throw new Error("Failed to update email")

      // Update local state
      setEmails((prev) => prev.map((email) => (email.id === emailId ? { ...email, ...updates } : email)))
    } catch (error) {
      console.error("Error updating email:", error)
      toast.error("Failed to update email")
    }
  }

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email)
    if (!email.is_read) {
      updateEmailStatus(email.id, { is_read: true })
    }
  }

  const toggleArchive = (email: Email, event: React.MouseEvent) => {
    event.stopPropagation()
    updateEmailStatus(email.id, { is_archived: !email.is_archived })
  }

  const toggleRead = (email: Email, event: React.MouseEvent) => {
    event.stopPropagation()
    updateEmailStatus(email.id, { is_read: !email.is_read })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
            <p className="text-gray-600">
              {searchQuery
                ? `No emails match your search for "${searchQuery}"`
                : "Try adjusting your filters or import some emails to get started."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !email.is_read ? "bg-blue-50/30" : ""
                }`}
                onClick={() => handleEmailClick(email)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback>{email.sender.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm truncate ${
                            !email.is_read ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                          }`}
                        >
                          {email.sender}
                        </p>

                        {email.account && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  {email.account.name || email.account.email.split("@")[0]}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white">
                                <p>From account: {email.account.email}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                        </span>

                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => toggleRead(email, e)}
                                >
                                  {email.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white">
                                <p>{email.is_read ? "Mark as unread" : "Mark as read"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => toggleArchive(email, e)}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white">
                                <p>{email.is_archived ? "Unarchive" : "Archive"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>

                    <h3
                      className={`text-sm mb-1 ${
                        !email.is_read ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                      }`}
                    >
                      {email.subject || "No Subject"}
                    </h3>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{email.snippet}</p>

                    <div className="flex items-center gap-2">
                      {email.category && (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: email.category.color + "20",
                            color: email.category.color,
                            borderColor: email.category.color + "40",
                          }}
                        >
                          {email.category.name}
                        </Badge>
                      )}

                      {email.suggested_category && !email.category && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-xs border-dashed"
                                style={{
                                  borderColor: email.suggested_category.color,
                                  color: email.suggested_category.color,
                                }}
                              >
                                <Bot className="h-3 w-3 mr-1" />
                                {email.suggested_category.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-white">
                              <p>Suggested by AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <EmailPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalEmails={totalEmails}
          emailsPerPage={emailsPerPage}
          onPageChange={setCurrentPage}
          onEmailsPerPageChange={setEmailsPerPage}
        />
      </Card>

      {selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          open={selectedEmail !== null}
          onOpenChange={(open) => !open && setSelectedEmail(null)}
          onEmailUpdate={(updates) => {
            setEmails((prev) => prev.map((email) => (email.id === selectedEmail.id ? { ...email, ...updates } : email)))
            setSelectedEmail((prev) => (prev ? { ...prev, ...updates } : null))
          }}
        />
      )}
    </>
  )
}
