"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Mail, Calendar, User, Sparkles, Loader2, AlertCircle, ExternalLink, Archive } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"

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
  summary?: string
  content_preview?: string
}

interface EmailDetailDialogProps {
  email: Email | null
  isOpen: boolean
  onClose: () => void
  onEmailUpdate?: (email: Email) => void
  categories: Array<{ id: string; name: string; color: string }>
}

interface EmailDetail {
  id: string
  subject: string
  sender: string
  sender_name?: string
  received_at: string
  ai_summary?: string
  email_body: string
  is_read: boolean
  snippet: string
  category?: {
    id: string
    name: string
    color: string
  }
  account?: {
    email: string
    name?: string
  }
}

export function EmailDetailDialog({ email, isOpen, onClose, onEmailUpdate, categories }: EmailDetailDialogProps) {
  const [emailDetail, setEmailDetail] = useState<EmailDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (email && isOpen) {
      fetchEmailContent()
    } else {
      setEmailDetail(null)
      setError(null)
    }
  }, [email, isOpen])

  const fetchEmailContent = async () => {
    if (!email) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emails/${email.id}/content`)

      if (response.ok) {
        const data = await response.json()
        setEmailDetail(data.email)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch email content")
      }
    } catch (error) {
      console.error("Error fetching email:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      showErrorToast(error, "Fetching Email Content")
    } finally {
      setLoading(false)
    }
  }

  const formatEmailBody = (body: string) => {
    if (!body) return "No content available"

    // Basic HTML to text conversion for display
    return body
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ") // Replace &nbsp; with spaces
      .replace(/&amp;/g, "&") // Replace &amp; with &
      .replace(/&lt;/g, "<") // Replace &lt; with <
      .replace(/&gt;/g, ">") // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .trim()
  }

  const getSenderInitials = (sender: string, senderName?: string) => {
    if (senderName) {
      return senderName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }

    const match = sender.match(/^([^<]+)/)
    const name = match ? match[1].trim() : sender
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getSenderName = (sender: string, senderName?: string) => {
    if (senderName) return senderName

    const match = sender.match(/^([^<]+)/)
    return match ? match[1].trim() : sender
  }

  const getSenderEmail = (sender: string) => {
    const match = sender.match(/<([^>]+)>/)
    return match ? match[1] : sender
  }

  const displayEmail = emailDetail || email

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col bg-background">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="flex items-center text-lg text-foreground">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            Email Details
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            View the full email content with AI-generated summary
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading email content...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-destructive">
            <AlertCircle className="h-8 w-8 mr-2" />
            <span>Failed to load email: {error}</span>
          </div>
        )}

        {displayEmail && !loading && !error && (
          <div className="flex-1 min-h-0 space-y-6">
            {/* Email Header */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src="/placeholder.svg"
                    alt={getSenderName(displayEmail.sender, displayEmail.sender_name)}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    {getSenderInitials(displayEmail.sender, displayEmail.sender_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground break-words leading-tight">
                    {displayEmail.subject}
                  </h2>
                  <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span className="font-medium">
                        {getSenderName(displayEmail.sender, displayEmail.sender_name)}
                      </span>
                    </div>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground">{getSenderEmail(displayEmail.sender)}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(displayEmail.received_at).toLocaleString()}</span>
                    </div>
                    {displayEmail.account && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>to {displayEmail.account.email}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    {displayEmail.category && (
                      <Badge
                        style={{
                          backgroundColor: `${displayEmail.category.color}15`,
                          color: displayEmail.category.color,
                          borderColor: `${displayEmail.category.color}30`,
                        }}
                        className="border"
                      >
                        {displayEmail.category.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Archive className="h-3 w-3 mr-1" />
                      {displayEmail.is_archived ? "Archived" : "Active"}
                    </Badge>
                    <Badge variant={displayEmail.is_read ? "secondary" : "default"} className="text-xs">
                      {displayEmail.is_read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {(emailDetail?.ai_summary || email?.summary) && (
                <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center mb-3">
                    <Sparkles className="h-5 w-5 text-primary mr-2" />
                    <h3 className="text-sm font-semibold text-primary">AI Summary</h3>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{emailDetail?.ai_summary || email?.summary}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Email Body */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Email Content</h3>
                <Button variant="outline" size="sm" className="text-xs bg-transparent">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Original
                </Button>
              </div>
              <ScrollArea className="h-[400px] w-full rounded-lg border bg-muted/30 p-6">
                <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {emailDetail?.email_body
                    ? formatEmailBody(emailDetail.email_body)
                    : email?.content_preview || "Loading content..."}
                </div>
              </ScrollArea>
            </div>

            {/* Footer Info */}
            <div className="flex-shrink-0 bg-muted/50 rounded-lg p-4 border">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Account:</span> {displayEmail.account?.email || "Unknown"}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {displayEmail.is_read ? "Read" : "Unread"}
                </div>
                <div>
                  <span className="font-medium">Received:</span>{" "}
                  {new Date(displayEmail.received_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {displayEmail.category?.name || "Uncategorized"}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
