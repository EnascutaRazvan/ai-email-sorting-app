"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, Calendar, User, Sparkles, Loader2, AlertCircle } from "lucide-react"
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
  category?: {
    name: string
    color: string
  }
  account: {
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center text-lg">
            <Mail className="mr-2 h-5 w-5 text-blue-600" />
            Email Details
          </DialogTitle>
          <DialogDescription>View the full email content with AI-generated summary</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading email content...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-8 w-8 mr-2" />
            <span>Failed to load email: {error}</span>
          </div>
        )}

        {email && !loading && !error && (
          <div className="flex-1 min-h-0 space-y-4">
            {/* Email Header */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg" alt={getSenderName(email.sender)} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                    {getSenderInitials(email.sender)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 break-words">{email.subject}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <User className="h-4 w-4" />
                    <span className="truncate">{getSenderName(email.sender)}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">{getSenderEmail(email.sender)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(email.received_at).toLocaleString()}</span>
                    {email.category && (
                      <>
                        <span className="text-gray-400">•</span>
                        <Badge
                          style={{ backgroundColor: email.category.color + "20", color: email.category.color }}
                          className="text-xs"
                        >
                          {email.category.name}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {email.ai_summary && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
                    <h4 className="text-sm font-medium text-purple-900">AI Summary</h4>
                  </div>
                  <p className="text-sm text-purple-800 leading-relaxed">{email.ai_summary}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Email Body */}
            <div className="flex-1 min-h-0">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Email Content</h4>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {formatEmailBody(email.email_body)}
                </div>
              </ScrollArea>
            </div>

            {/* Footer Info */}
            <div className="flex-shrink-0 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span>Account: {email.account.email}</span>
                <span>Status: {email.is_read ? "Read" : "Unread"}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
