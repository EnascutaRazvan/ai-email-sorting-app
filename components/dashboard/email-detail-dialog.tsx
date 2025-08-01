"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Calendar, User, Mail, Loader2, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Email {
  id: string
  subject: string
  sender: string
  snippet: string
  ai_summary?: string
  email_body?: string
  received_at: string
  is_read: boolean
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

interface EmailDetailDialogProps {
  email: Email | null
  isOpen: boolean
  onClose: () => void
  onEmailUpdate?: (email: Email) => void
}

export function EmailDetailDialog({ email, isOpen, onClose, onEmailUpdate }: EmailDetailDialogProps) {
  const [emailContent, setEmailContent] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (email && isOpen) {
      fetchEmailContent(email.id)
    } else {
      setEmailContent(null)
      setError(null)
    }
  }, [email, isOpen])

  const fetchEmailContent = async (emailId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/emails/${emailId}/content`)
      const result = await response.json()

      if (response.ok && result.success) {
        setEmailContent(result.email)
        onEmailUpdate?.(result.email)
      } else {
        throw new Error(result.error || "Failed to fetch email content")
      }
    } catch (error) {
      console.error("Error fetching email content:", error)
      setError(error.message)
      toast({
        title: "Error",
        description: "Failed to load email content",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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

  const displayEmail = emailContent || email

  if (!displayEmail) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold pr-8 line-clamp-2">{displayEmail.subject}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Email metadata */}
          <div className="flex-shrink-0 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">{displayEmail.sender}</span>
              {displayEmail.account?.email && (
                <>
                  <span>•</span>
                  <span className="text-xs">to {displayEmail.account.email}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(displayEmail.received_at)}</span>
            </div>

            {displayEmail.category && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: `${displayEmail.category.color}20`,
                    color: displayEmail.category.color,
                    borderColor: `${displayEmail.category.color}40`,
                  }}
                  className="border"
                >
                  {displayEmail.category.name}
                </Badge>
              </div>
            )}

            {displayEmail.ai_summary && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Summary</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{displayEmail.ai_summary}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Email content */}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-medium mb-3">Email Content</h4>
            <ScrollArea className="h-full">
              <div className="pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-muted-foreground">Loading email content...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-8 text-red-600">
                    <AlertCircle className="h-8 w-8 mr-2" />
                    <div className="text-center">
                      <p className="font-medium">Failed to load email content</p>
                      <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    </div>
                  </div>
                ) : displayEmail.email_body ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 dark:bg-gray-900 p-4 rounded border">
                      {formatEmailBody(displayEmail.email_body)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Email content not available</p>
                    {displayEmail.snippet && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded border">
                        <p className="text-sm font-medium mb-2">Preview:</p>
                        <p className="text-sm">{displayEmail.snippet}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
