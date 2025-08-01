"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Search, Filter, Clock, User, Sparkles } from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"
import { format } from "date-fns"
import { toast } from "sonner"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  ai_summary: string
  received_at: string
  is_read: boolean
  categories?: {
    name: string
    color: string
  }
  user_accounts?: {
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
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    fetchEmails()
    fetchCategories()
  }, [])

  const fetchEmails = async () => {
    try {
      const response = await fetch("/api/emails")
      const data = await response.json()

      if (data.success) {
        setEmails(data.emails)
      } else {
        toast.error("Failed to fetch emails")
      }
    } catch (error) {
      console.error("Error fetching emails:", error)
      toast.error("Failed to fetch emails")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()

      if (data.success) {
        setCategories(data.categories)
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
      (selectedCategory === "uncategorized" && !email.categories) ||
      email.categories?.name === selectedCategory

    return matchesSearch && matchesCategory
  })

  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId)
    setDialogOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Emails</CardTitle>
          <CardDescription>Loading your imported emails...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Mail className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Your Emails
          </CardTitle>
          <CardDescription>AI-processed and categorized emails from your connected accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
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
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email List */}
          {filteredEmails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {emails.length === 0 ? "No emails imported yet" : "No emails match your search"}
              </h3>
              <p className="text-muted-foreground">
                {emails.length === 0
                  ? "Import emails from your connected accounts to get started"
                  : "Try adjusting your search terms or category filter"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleEmailClick(email.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium truncate ${!email.is_read ? "font-semibold" : ""}`}>
                          {email.subject}
                        </h3>
                        {!email.is_read && <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="h-3 w-3" />
                        <span className="truncate">{email.sender}</span>
                        <Clock className="h-3 w-3 ml-2" />
                        <span>{format(new Date(email.received_at), "MMM d, yyyy")}</span>
                      </div>

                      {email.ai_summary && (
                        <div className="flex items-start gap-2 mb-2">
                          <Sparkles className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-purple-700 dark:text-purple-300 line-clamp-2">
                            {email.ai_summary}
                          </p>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {email.categories && (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: email.categories.color + "20",
                            color: email.categories.color,
                          }}
                        >
                          {email.categories.name}
                        </Badge>
                      )}
                      {email.user_accounts && (
                        <span className="text-xs text-muted-foreground">{email.user_accounts.email}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EmailDetailDialog emailId={selectedEmailId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
