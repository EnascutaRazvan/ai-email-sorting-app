"use client"

import { useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Mail, Tag, X, EyeOff, Eye } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import { useState } from "react"

interface Email {
  id: string
  subject: string
  sender: string
  sender_email: string
  date: string
  is_read: boolean
  category_id: string | null
  account_id: string
  account_email: string
  full_content?: string
}

interface Category {
  id: string
  name: string
  color: string
}

interface EmailDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  email: Email
  onCategorize: (emailId: string, categoryId: string | null) => void
  categories: Category[]
}

export function EmailDetailDialog({ isOpen, onClose, email, onCategorize, categories }: EmailDetailDialogProps) {
  const [emailContent, setEmailContent] = useState<string | null>(email.full_content || null)
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isReadStatus, setIsReadStatus] = useState(email.is_read)
  const { toast } = useToast()

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    return categories.find((c) => c.id === categoryId)?.name || "Unknown Category"
  }

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return "bg-gray-200 text-gray-800" // Default for Uncategorized
    return categories.find((c) => c.id === categoryId)?.color || "bg-gray-200 text-gray-800"
  }

  const fetchEmailContent = async (emailId: string) => {
    setIsLoadingContent(true)
    try {
      const response = await fetch(`/api/emails/${emailId}/content`)
      if (!response.ok) {
        throw new Error("Failed to fetch email content")
      }
      const data = await response.json()
      setEmailContent(data.content)
      setIsReadStatus(true) // Mark as read after fetching content
      toast({
        title: "Email Marked as Read",
        description: "The email has been marked as read.",
      })
    } catch (error: any) {
      console.error("Error fetching email content:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load email content.",
        variant: "destructive",
      })
      setEmailContent("Failed to load email content.")
    } finally {
      setIsLoadingContent(false)
    }
  }

  const handleToggleReadStatus = async () => {
    const newReadStatus = !isReadStatus
    try {
      const response = await fetch(`/api/emails/${email.id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: newReadStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update read status")
      }

      setIsReadStatus(newReadStatus)
      toast({
        title: "Read Status Updated",
        description: `Email marked as ${newReadStatus ? "read" : "unread"}.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update read status.",
        variant: "destructive",
      })
    }
  }

  // Fetch content only when dialog opens and content is not already loaded
  useEffect(() => {
    if (isOpen && !emailContent) {
      fetchEmailContent(email.id)
    }
    if (isOpen) {
      setIsReadStatus(email.is_read) // Ensure read status is in sync with prop when opening
    }
  }, [isOpen, email.id, emailContent, email.is_read])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{email.subject}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            From:{" "}
            <span className="font-medium">
              {email.sender} &lt;{email.sender_email}&gt;
            </span>
            <br />
            To: <span className="font-medium">{email.account_email}</span>
            <br />
            Received: {format(new Date(email.date), "MMM dd, yyyy hh:mm a")}
          </DialogDescription>
          <div className="flex items-center gap-2 mt-2">
            <Badge className="px-2 py-0.5" style={{ backgroundColor: getCategoryColor(email.category_id) }}>
              {getCategoryName(email.category_id)}
            </Badge>
            <Badge variant="secondary" className="px-2 py-0.5">
              {email.account_email}
            </Badge>
            {isReadStatus ? (
              <Badge variant="outline" className="px-2 py-0.5">
                Read
              </Badge>
            ) : (
              <Badge variant="outline" className="px-2 py-0.5">
                Unread
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="h-4 w-4 mr-2" /> Categorize
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onCategorize(email.id, null)}>
                <Mail className="h-4 w-4 mr-2" /> Mark Uncategorized
              </DropdownMenuItem>
              {categories.map((category) => (
                <DropdownMenuItem key={category.id} onClick={() => onCategorize(email.id, category.id)}>
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  Categorize as {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={handleToggleReadStatus}>
            {isReadStatus ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            Mark as {isReadStatus ? "Unread" : "Read"}
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4 border rounded-md bg-muted/20">
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : emailContent ? (
            <div dangerouslySetInnerHTML={{ __html: emailContent }} className="prose dark:prose-invert max-w-none" />
          ) : (
            <p className="text-muted-foreground">No content available or failed to load.</p>
          )}
        </ScrollArea>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" /> Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
