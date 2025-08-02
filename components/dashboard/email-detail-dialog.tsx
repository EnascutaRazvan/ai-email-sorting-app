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

interface EmailDetailDialogProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

interface EmailDetail {
  id: string
  subject: string
  sender: string
  received_at: string
  ai_summary: string
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

export function EmailDetailDialog({ emailId, isOpen, onClose }: EmailDetailDialogProps) {
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (emailId && isOpen) {
      fetchEmailContent()
    } else {
      setEmail(null)
      setError(null)
    }
  }, [emailId, isOpen])

  const fetchEmailContent = async () => {
    if (!emailId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emails/${emailId}/content`)

      if (response.ok) {
        const data = await response.json()
        setEmail(data.email)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch email content")
      }
    } catch (error) {
      console.error("Error fetching email:", error)
      setError(error.message)
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col bg-white">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle className="flex items-center text-lg text-gray-900">
            <Mail className="mr-2 h-5 w-5 text-blue-600" />
            Email Details
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            View the full email content with AI-generated summary
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading email content...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-12 text-red-600">
            <AlertCircle className="h-8 w-8 mr-2" />
            <span>Failed to load email: {error}</span>
          </div>
        )}

        {email && !loading && !error && (
          <div className="flex-1 min-h-0 space-y-6">
            {/* Email Header */}
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder.svg" alt={getSenderName(email.sender)} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {getSenderInitials(email.sender)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 break-words leading-tight">{email.subject}</h2>
                  <div className="flex items-center space-x-3 text-sm text-gray-600 mt-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span className="font-medium">{getSenderName(email.sender)}</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{getSenderEmail(email.sender)}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{new Date(email.received_at).toLocaleString()}</span>
                    </div>
                    {email.account && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>to {email.account.email}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-3">
                    {email.category && (
                      <Badge
                        style={{
                          backgroundColor: `${email.category.color}15`,
                          color: email.category.color,
                          borderColor: `${email.category.color}30`,
                        }}
                        className="border"
                      >
                        {email.category.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                    <Badge variant={email.is_read ? "secondary" : "default"} className="text-xs">
                      {email.is_read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {email.ai_summary && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
                  <div className="flex items-center mb-3">
                    <Sparkles className="h-5 w-5 text-purple-600 mr-2" />
                    <h3 className="text-sm font-semibold text-purple-900">AI Summary</h3>
                  </div>
                  <p className="text-sm text-purple-800 leading-relaxed">{email.ai_summary}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Email Body */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Content</h3>
                <Button variant="outline" size="sm" className="text-xs bg-transparent">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Original
                </Button>
              </div>
              <ScrollArea className="h-[400px] w-full rounded-lg border bg-gray-50/50 p-6">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {formatEmailBody(email.email_body) || email.snippet || "No content available"}
                </div>
              </ScrollArea>
            </div>

            {/* Footer Info */}
            <div className="flex-shrink-0 bg-gray-50 rounded-lg p-4 border">
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Account:</span> {email.account?.email || "Unknown"}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {email.is_read ? "Read" : "Unread"}
                </div>
                <div>
                  <span className="font-medium">Received:</span> {new Date(email.received_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {email.category?.name || "Uncategorized"}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
