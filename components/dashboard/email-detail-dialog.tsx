"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mail, Clock, User, Sparkles, Bot, AtSign, Calendar, Archive, ExternalLink, Loader2 } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"

interface EmailCategory {
  id: string
  name: string
  color: string
  is_ai_suggested: boolean
  confidence_score?: number
}

interface EmailDetail {
  id: string
  subject: string
  sender: string
  sender_email: string
  received_at: string
  ai_summary: string
  email_body: string
  is_read: boolean
  category: EmailCategory | null
  account: {
    id: string
    email: string
    name?: string
    picture?: string
  }
}

interface EmailDetailDialogProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

export function EmailDetailDialog({ emailId, isOpen, onClose }: EmailDetailDialogProps) {
  const { data: session } = useSession()
  const [email, setEmail] = useState<EmailDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && emailId) {
      fetchEmailDetails()
    } else {
      setEmail(null)
    }
  }, [isOpen, emailId])

  const fetchEmailDetails = async () => {
    if (!emailId || !session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/emails/${emailId}/content`)
      if (response.ok) {
        const data = await response.json()
        setEmail(data.email)
      } else {
        throw new Error("Failed to fetch email details")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Email Details")
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const getSenderName = (sender: string) => {
    const match = sender.match(/^([^<]+)/)
    return match ? match[1].trim() : sender
  }

  const getSenderEmail = (sender: string) => {
    const match = sender.match(/<([^>]+)>/)
    return match ? match[1] : sender
  }

  const getSenderInitials = (sender: string) => {
    const name = getSenderName(sender)
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }
  }

  const getAccountDisplayName = (account: EmailDetail["account"]) => {
    return account.email.split("@")[0]
  }

  const formatEmailBody = (body: string) => {
    // Basic HTML to text conversion for display
    return body
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
      .replace(/&amp;/g, "&") // Replace HTML entities
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim()
  }

  if (!isOpen) return null

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading email...</span>
            </div>
          ) : email ? (
            <>
              <DialogHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage
                        src={email.account.picture || "/placeholder.svg"}
                        alt={getSenderName(email.sender)}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                        {getSenderInitials(email.sender)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-semibold text-gray-900 line-clamp-2 mb-2">
                        {email.subject}
                      </DialogTitle>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">{getSenderName(email.sender)}</span>
                          <span className="text-sm text-gray-600">&lt;{getSenderEmail(email.sender)}&gt;</span>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(email.received_at).date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(email.received_at).time}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center"
                              >
                                <AtSign className="h-3 w-3 mr-1" />
                                {getAccountDisplayName(email.account)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Received in: {email.account.email}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Badge variant="outline" className="text-xs flex items-center">
                            <Archive className="h-3 w-3 mr-1" />
                            Archived in Gmail
                          </Badge>

                          {!email.is_read && <Badge className="bg-blue-100 text-blue-700 text-xs">Unread</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                {email.category && (
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: email.category.is_ai_suggested
                          ? `${email.category.color}10`
                          : `${email.category.color}15`,
                        color: email.category.color,
                        borderColor: email.category.is_ai_suggested
                          ? `${email.category.color}40`
                          : `${email.category.color}30`,
                      }}
                      className={`border ${email.category.is_ai_suggested ? "border-dashed" : ""} flex items-center`}
                    >
                      {email.category.is_ai_suggested && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Bot className="h-3 w-3 mr-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>AI suggested category</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {email.category.name}
                      {email.category.is_ai_suggested && <span className="text-xs opacity-70 ml-1">by AI</span>}
                    </Badge>
                  </div>
                )}

                {/* AI Summary */}
                {email.ai_summary && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center mb-2">
                      <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-purple-900">AI Summary</span>
                    </div>
                    <p className="text-sm text-purple-800 leading-relaxed">{email.ai_summary}</p>
                  </div>
                )}
              </DialogHeader>

              <Separator />

              {/* Email Content */}
              <ScrollArea className="max-h-96 w-full">
                <div className="space-y-4">
                  <DialogDescription className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {formatEmailBody(email.email_body)}
                  </DialogDescription>
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-gray-500">Email ID: {email.id}</div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.id}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in Gmail
                  </Button>
                  <Button onClick={onClose}>Close</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Email not found</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
