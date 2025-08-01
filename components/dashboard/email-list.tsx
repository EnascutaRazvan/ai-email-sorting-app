"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Mail, MailOpen, Sparkles, Calendar, User, Filter, RefreshCw } from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"
import { toast } from "@/hooks/use-toast"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  ai_summary?: string
  received_at: string
  is_read: boolean
  category?: {
    id: string
    name: string
    color: string
  }
  account?: {
    email: string
  }
}

interface Category {
  id: string
  name: string
  color: string
}

export function EmailList() {
  const [emails, setEmails] = useState<Email[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  useEffect(() => {
    fetchEmails()
    fetchCategories()
  }, [])

  const fetchEmails = async () => {
    try {
      const response = await fetch("/api/emails")
      const result = await response.json()

      if (response.ok) {
        setEmails(result.emails || [])
      } else {
        throw new Error(result.error || "Failed to fetch emails")
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
      toast({
        title: "Error",
        description: "Failed to load emails",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const result = await response.json()

      if (response.ok) {
        setCategories(result.categories || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.snippet.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      selectedCategory === "all" ||
      (selectedCategory === "uncategorized" && !email.category) ||
      email.category?.id === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email)
    setShowEmailDialog(true)
  }

  const handleEmailUpdate = (updatedEmail: Email) => {
    setEmails((prev) => prev.map((email) => (email.id === updatedEmail.id ? updatedEmail : email)))
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

  const getEmailCounts = () => {
    const total = emails.length
    const unread = emails.filter((e) => !e.is_read).length
    const categorized = emails.filter((e) => e.category).length

    return { total, unread, categorized }
  }

  const counts = getEmailCounts()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
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
              <Mail className="h-5 w-5" />
              Your Emails
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchEmails}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Email stats */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{counts.total} total</span>
            <span>{counts.unread} unread</span>
            <span>{counts.categorized} categorized</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email list */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredEmails.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    {emails.length === 0 ? "No emails found" : "No matching emails"}
                  </p>
                  <p className="text-sm">
                    {emails.length === 0
                      ? "Import emails from your connected accounts to get started"
                      : "Try adjusting your search or filter criteria"}
                  </p>
                </div>
              ) : (
                filteredEmails.map((email, index) => (
                  <div key={email.id}>
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        !email.is_read ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" : ""
                      }`}
                      onClick={() => handleEmailClick(email)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {email.is_read ? (
                              <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                            <h3 className={`font-medium truncate ${!email.is_read ? "font-semibold" : ""}`}>
                              {email.subject}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="h-3 w-3" />
                            <span className="truncate">{email.sender}</span>
                            {email.account && (
                              <>
                                <span>•</span>
                                <span className="text-xs">{email.account.email}</span>
                              </>
                            )}
                          </div>

                          {email.ai_summary && (
                            <div className="flex items-start gap-2 mb-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded text-sm">
                              <Sparkles className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
                              <span className="text-purple-700 dark:text-purple-300 line-clamp-2">
                                {email.ai_summary}
                              </span>
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{email.snippet}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(email.received_at)}
                          </div>

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
                      </div>
                    </div>
                    {index < filteredEmails.length - 1 && <Separator className="my-2" />}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <EmailDetailDialog
        email={selectedEmail}
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        onEmailUpdate={handleEmailUpdate}
      />
    </>
  )
}
