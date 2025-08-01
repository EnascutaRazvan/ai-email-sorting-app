"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Trash2, Unlink, RefreshCw, User, Calendar, Inbox, Star, Send } from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"

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
  account_email: string
  account_name?: string
  account_picture?: string
  labels?: string[]
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
  const [activeTab, setActiveTab] = useState("all")
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isEmailDetailOpen, setIsEmailDetailOpen] = useState(false)

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
      setSelectedEmails(new Set(filteredEmails.map((email) => email.id)))
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
      await fetch("/api/emails/process", { method: "POST" })
      await fetchEmails()
    } catch (error) {
      console.error("Error refreshing emails:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId)
    setIsEmailDetailOpen(true)
  }

  const handleCloseEmailDetail = () => {
    setIsEmailDetailOpen(false)
    setSelectedEmailId(null)
  }

  // Filter emails based on active tab
  const filteredEmails = emails.filter((email) => {
    if (activeTab === "all") return true
    if (activeTab === "unread") return !email.is_read
    if (activeTab === "important") return email.labels?.includes("IMPORTANT")
    if (activeTab === "sent") return email.labels?.includes("SENT")
    return true
  })

  // Group emails by account
  const emailsByAccount = filteredEmails.reduce(
    (acc, email) => {
      const key = email.account_email
      if (!acc[key]) {
        acc[key] = {
          account: {
            email: email.account_email,
            name: email.account_name,
            picture: email.account_picture,
          },
          emails: [],
        }
      }
      acc[key].emails.push(email)
      return acc
    },
    {} as Record<string, { account: any; emails: Email[] }>,
  )

  if (isLoading) {
    return (
      <Card className="h-full shadow-sm border-0 bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Email Inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-300 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-3/4" />
                    <div className="h-3 bg-gray-300 rounded w-1/2" />
                    <div className="h-3 bg-gray-300 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full shadow-sm border-0 bg-white/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
            <Inbox className="mr-2 h-4 w-4 text-blue-600" />
            Email Inbox
            <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
              {filteredEmails.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs bg-transparent"
            >
              <RefreshCw className={`mr-2 h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Email Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100/50">
            <TabsTrigger value="all" className="text-xs">
              <Mail className="mr-1 h-3 w-3" />
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              <div className="w-2 h-2 bg-blue-600 rounded-full mr-1" />
              Unread
            </TabsTrigger>
            <TabsTrigger value="important" className="text-xs">
              <Star className="mr-1 h-3 w-3" />
              Important
            </TabsTrigger>
            <TabsTrigger value="sent" className="text-xs">
              <Send className="mr-1 h-3 w-3" />
              Sent
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {selectedEmails.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
            <span className="text-sm text-gray-600">{selectedEmails.size} selected</span>
            <Button
              onClick={handleBulkDelete}
              variant="destructive"
              size="sm"
              disabled={isProcessing}
              className="text-xs"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
            <Button
              onClick={handleBulkUnsubscribe}
              variant="outline"
              size="sm"
              disabled={isProcessing}
              className="text-xs bg-transparent"
            >
              <Unlink className="mr-1 h-3 w-3" />
              Unsubscribe
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {filteredEmails.length > 0 && (
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox checked={selectedEmails.size === filteredEmails.length} onCheckedChange={handleSelectAll} />
            <span className="text-sm text-gray-600">Select all</span>
          </div>
        )}

        {filteredEmails.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No emails found</h3>
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              {selectedCategory
                ? "No emails in this category yet."
                : "Connect your Gmail accounts and refresh to see your emails."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(emailsByAccount).map(([accountEmail, { account, emails: accountEmails }]) => (
              <div key={accountEmail} className="space-y-3">
                {/* Account Header */}
                <div className="flex items-center space-x-3 pb-2 border-b border-gray-200">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                      {account.name ? (
                        account.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{account.email}</p>
                    {account.name && <p className="text-xs text-gray-600">{account.name}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {accountEmails.length} emails
                  </Badge>
                </div>

                {/* Account Emails */}
                <div className="space-y-2">
                  {accountEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email.id)}
                      className={`group bg-white border border-gray-200/50 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-blue-200 cursor-pointer ${
                        selectedEmails.has(email.id) ? "bg-blue-50 border-blue-200 shadow-sm" : ""
                      } ${!email.is_read ? "bg-gradient-to-r from-blue-50/30 to-transparent" : ""}`}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              <h4
                                className={`font-medium text-sm truncate ${!email.is_read ? "font-semibold text-gray-900" : "text-gray-800"}`}
                              >
                                {email.subject}
                              </h4>
                              {!email.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {email.category_name && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5"
                                  style={{
                                    backgroundColor: `${email.category_color}20`,
                                    color: email.category_color,
                                    borderColor: `${email.category_color}30`,
                                  }}
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

                          <div className="flex items-center text-sm text-gray-600 space-x-2">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{email.sender}</span>
                          </div>

                          {email.ai_summary && (
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-3">
                              <p className="text-sm text-indigo-900">
                                <span className="font-medium">AI Summary:</span> {email.ai_summary}
                              </p>
                            </div>
                          )}

                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{email.snippet}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Email Detail Dialog */}
        <EmailDetailDialog emailId={selectedEmailId} isOpen={isEmailDetailOpen} onClose={handleCloseEmailDetail} />
      </CardContent>
    </Card>
  )
}
