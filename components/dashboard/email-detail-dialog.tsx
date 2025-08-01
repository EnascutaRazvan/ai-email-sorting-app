"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Loader2, Mail, Calendar, User, Tag } from "lucide-react"
import { format } from "date-fns"

interface EmailDetailDialogProps {
  emailId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EmailContent {
  id: string
  subject: string
  sender: string
  body: string
  summary: string
  receivedAt: string
  isRead: boolean
  category?: {
    name: string
    color: string
  }
  account?: {
    email: string
  }
}

export function EmailDetailDialog({ emailId, open, onOpenChange }: EmailDetailDialogProps) {
  const [email, setEmail] = useState<EmailContent | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (emailId && open) {
      fetchEmailContent(emailId)
    }
  }, [emailId, open])

  const fetchEmailContent = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/emails/${id}/content`)
      const data = await response.json()

      if (data.success) {
        setEmail(data.email)
      } else {
        console.error("Failed to fetch email content:", data.error)
      }
    } catch (error) {
      console.error("Error fetching email content:", error)
    } finally {
      setLoading(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Details
          </DialogTitle>
          <DialogDescription>View the full email content and AI-generated summary</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : email ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* Email Header */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">{email.subject}</h3>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{email.sender}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(email.receivedAt), "PPp")}</span>
                  </div>
                  {email.category && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: email.category.color + "20", color: email.category.color }}
                      >
                        {email.category.name}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* AI Summary */}
              {email.summary && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">AI Summary</h4>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">{email.summary}</p>
                </div>
              )}

              <Separator />

              {/* Email Body */}
              <div>
                <h4 className="font-medium mb-3">Email Content</h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{formatEmailBody(email.body)}</pre>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Failed to load email content</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
