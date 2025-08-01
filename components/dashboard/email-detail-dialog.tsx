"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Calendar, User, Mail } from "lucide-react"
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
    name: string
    color: string
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

  useEffect(() => {
    if (email && isOpen) {
      fetchEmailContent(email.id)
    }
  }, [email, isOpen])

  const fetchEmailContent = async (emailId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/emails/${emailId}/content`)
      const result = await response.json()

      if (response.ok) {
        setEmailContent(result.email)
        onEmailUpdate?.(result.email)
      } else {
        throw new Error(result.error || "Failed to fetch email content")
      }
    } catch (error) {
      console.error("Error fetching email content:", error)
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

  const displayEmail = emailContent || email

  if (!displayEmail) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold pr-8">{displayEmail.subject}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Email metadata */}
          <div className="flex-shrink-0 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium">{displayEmail.sender}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(displayEmail.received_at)}</span>
            </div>

            {displayEmail.category && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  style={{ backgroundColor: `${displayEmail.category.color}20`, color: displayEmail.category.color }}
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
                <p className="text-sm text-gray-700 dark:text-gray-300">{displayEmail.ai_summary}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Email content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {displayEmail.email_body ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {displayEmail.email_body}
                      </pre>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Email content not available</p>
                        <p className="text-xs mt-2">{displayEmail.snippet && `Preview: ${displayEmail.snippet}`}</p>
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
