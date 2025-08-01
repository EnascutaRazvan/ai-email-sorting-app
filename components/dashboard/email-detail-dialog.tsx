"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Mail, Sparkles, Loader2 } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"

interface EmailDetailDialogProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

interface EmailContent {
  id: string
  subject: string
  sender: string
  received_at: string
  body: string
  ai_summary: string
}

export function EmailDetailDialog({ emailId, isOpen, onClose }: EmailDetailDialogProps) {
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (emailId && isOpen) {
      fetchEmailContent(emailId)
    } else {
      setEmailContent(null)
    }
  }, [emailId, isOpen])

  const fetchEmailContent = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/emails/${id}/content`)
      if (response.ok) {
        const content = await response.json()
        setEmailContent(content)
      } else {
        throw new Error("Failed to fetch email content")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Email Content")
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const formatEmailBody = (body: string) => {
    // Basic HTML to text conversion for display
    return body
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim()
  }

  const extractSenderName = (sender: string) => {
    const match = sender.match(/^(.+?)\s*</)
    return match ? match[1].replace(/"/g, "") : sender.split("@")[0]
  }

  const extractSenderEmail = (sender: string) => {
    const match = sender.match(/<(.+?)>/)
    return match ? match[1] : sender
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading email content...</p>
            </div>
          </div>
        ) : emailContent ? (
          <>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-xl font-semibold leading-tight pr-8">{emailContent.subject}</DialogTitle>
              <DialogDescription className="sr-only">Email details and content</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 min-h-0">
              {/* Email Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg" alt={extractSenderName(emailContent.sender)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {extractSenderName(emailContent.sender)
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium text-gray-900">{extractSenderName(emailContent.sender)}</p>
                      <Badge variant="outline" className="text-xs">
                        <Mail className="mr-1 h-3 w-3" />
                        {extractSenderEmail(emailContent.sender)}
                      </Badge>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="mr-1 h-3 w-3" />
                      {new Date(emailContent.received_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {emailContent.ai_summary && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-indigo-900 mb-1">AI Summary</h4>
                      <p className="text-sm text-indigo-800 leading-relaxed">{emailContent.ai_summary}</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Email Content */}
              <div className="flex-1 min-h-0">
                <h4 className="font-medium text-gray-900 mb-3">Email Content</h4>
                <ScrollArea className="h-[400px] w-full rounded-lg border bg-white p-4">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                      {formatEmailBody(emailContent.body)}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No email selected</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
