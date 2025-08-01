"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, Search, Filter, Clock, User, Sparkles, RefreshCw, MailOpen, Archive } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"
import { EmailDetailDialog } from "./email-detail-dialog"

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
  account: {
    email: string
    name?: string
  }
}

interface EmailListProps {
  selectedCategory: string | null
}

export function EmailList({ selectedCategory }: EmailListProps) {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchEmails()
    }
  }, [session])

  useEffect(() => {
    filterEmails()
  }, [emails, selectedCategory, searchQuery])

  const fetchEmails = async () => {
    try {
      const response = await fetch("/api/emails")
      if (response.ok) {
        const data = await response.json()
        setEmails(data.emails || [])
      } else {
        throw new Error("Failed to fetch emails")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Emails")
    } finally {
      setIsLoading(false)
    }
  }

  const filterEmails = () => {
    let filtered = emails

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((email) => email.category?.id === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.sender.toLowerCase().includes(query) ||
          email.snippet.toLowerCase().includes(query) ||
          email.ai_summary.toLowerCase().includes(query),
      )
    }

    // Sort by received date (newest first)
    filtered.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())

    setFilteredEmails(filtered)
  }

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId)
    setIsDetailDialogOpen(true)
  }

  const handleCloseDetailDialog = () => {
    setIsDetailDialogOpen(false)
    setSelectedEmailId(null)
    // Refresh emails to update read status
    fetchEmails()
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
    <>
      <Card className="shadow-sm border-0 bg-white/50 backdrop-blur-sm h-full flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center">
              <Mail className="mr-2 h-4 w-4 text-blue-600" />
              Emails
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
                {filteredEmails.length}
              </Badge>
            </CardTitle>
            <Button onClick={fetchEmails} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/50 border-gray-200/50"
            />
          </div>

          {/* Filter Info */}
          {selectedCategory && (
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-1" />
              <span>Filtered by category</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0">
          {filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "No emails found" : "No emails yet"}
              </h3>
              <p className="text-sm text-gray-600 max-w-sm">
                {searchQuery
                  ? "Try adjusting your search terms or filters"
                  : "Import emails from your connected Gmail accounts to get started"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1 p-4">
                {filteredEmails.map((email) => (
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
                        <AvatarImage src="/placeholder.svg" alt={getSenderName(email.sender)} />
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
                            {email.category && (
                              <Badge
                                style={{
                                  backgroundColor: email.category.color + "20",
                                  color: email.category.color,
                                  borderColor: email.category.color + "40",
                                }}
                                className="text-xs border"
                              >
                                {email.category.name}
                              </Badge>
                            )}
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

                        {/* AI Summary */}
                        {email.ai_summary && (
                          <div className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-md p-2 mb-2">
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
                            <span className="truncate">{email.account.email}</span>
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
          )}
        </CardContent>
      </Card>

      {/* Email Detail Dialog */}
      <EmailDetailDialog emailId={selectedEmailId} isOpen={isDetailDialogOpen} onClose={handleCloseDetailDialog} />
    </>
  )
}
