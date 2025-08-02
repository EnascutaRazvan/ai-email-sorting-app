"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MailOpen, Trash2, UserX, Sparkles, Loader2 } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface EmailDetailDialogProps {
  emailId: string | null
  isOpen: boolean
  onClose: () => void
}

interface EmailContent {
  htmlContent: string
  textContent: string
}

interface Category {
  id: string
  name: string
  color: string
}

export function EmailDetailDialog({ emailId, isOpen, onClose }: EmailDetailDialogProps) {
  const [emailContent, setEmailContent] = useState<EmailContent | null>(null)
  const [emailDetails, setEmailDetails] = useState<any>(null) // To store subject, sender, category etc.
  const [isLoadingContent, setIsLoadingContent] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [isUnsubscribeAlertDialogOpen, setIsUnsubscribeAlertDialogOpen] = useState(false)

  useEffect(() => {
    if (isOpen && emailId) {
      fetchEmailDetailsAndContent(emailId)
      fetchCategories()
    } else {
      // Reset state when dialog closes
      setEmailContent(null)
      setEmailDetails(null)
      setSelectedCategory(undefined)
    }
  }, [isOpen, emailId])

  const fetchEmailDetailsAndContent = async (id: string) => {
    setIsLoadingContent(true)
    try {
      // Fetch email details (subject, sender, current category)
      const detailsResponse = await fetch(`/api/emails?id=${id}`)
      if (detailsResponse.ok) {
        const data = await detailsResponse.json()
        const email = data.emails?.[0] // API returns an array
        if (email) {
          setEmailDetails(email)
          setSelectedCategory(email.category?.id || "uncategorized")
        } else {
          throw new Error("Email details not found")
        }
      } else {
        throw new Error("Failed to fetch email details")
      }

      // Fetch email content
      const contentResponse = await fetch(`/api/emails/${id}/content`)
      if (contentResponse.ok) {
        const data = await contentResponse.json()
        setEmailContent(data)
      } else {
        throw new Error("Failed to fetch email content")
      }
    } catch (error) {
      showErrorToast(error, "Fetching Email Content")
      onClose() // Close dialog on error
    } finally {
      setIsLoadingContent(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleCategoryChange = async (newCategoryId: string) => {
    if (!emailId) return

    setIsUpdatingCategory(true)
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, categoryId: newCategoryId }),
      })
      if (response.ok) {
        setSelectedCategory(newCategoryId)
        showSuccessToast("Category Updated", "Email category updated successfully.")
        // Update emailDetails to reflect new category
        setEmailDetails((prev: any) => ({
          ...prev,
          category: categories.find((cat) => cat.id === newCategoryId),
        }))
      } else {
        throw new Error("Failed to update category")
      }
    } catch (error) {
      showErrorToast(error, "Update Category")
    } finally {
      setIsUpdatingCategory(false)
    }
  }

  const handleMarkAsReadUnread = async (readStatus: boolean) => {
    if (!emailId) return

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, isRead: readStatus }),
      })
      if (response.ok) {
        setEmailDetails((prev: any) => ({ ...prev, is_read: readStatus }))
        showSuccessToast("Email Status Updated", `Email marked as ${readStatus ? "read" : "unread"}.`)
      } else {
        throw new Error("Failed to update read status")
      }
    } catch (error) {
      showErrorToast(error, "Update Read Status")
    }
  }

  const handleDeleteEmail = async () => {
    if (!emailId) return

    setIsDeleting(true)
    try {
      const response = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: [emailId] }),
      })

      if (response.ok) {
        showSuccessToast("Email Deleted", "Email moved to trash and removed from your list.")
        onClose() // Close dialog after successful deletion
      } else {
        throw new Error("Failed to delete email")
      }
    } catch (error) {
      showErrorToast(error, "Delete Email")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!emailId) return

    setIsUnsubscribing(true)
    setIsUnsubscribeAlertDialogOpen(false) // Close the alert dialog
    try {
      const response = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: [emailId] }),
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.results[0]
        if (result.success) {
          showSuccessToast("Unsubscribe Successful", result.summary)
          onClose() // Close dialog after successful unsubscribe
        } else {
          showErrorToast(result.summary, "Unsubscribe Failed")
        }
      } else {
        throw new Error("Failed to process unsubscribe request")
      }
    } catch (error) {
      showErrorToast(error, "Unsubscribe")
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const getCategoryColor = (categoryId: string | undefined) => {
    if (!categoryId) return "#9CA3AF" // Default gray for uncategorized or unknown
    const category = categories.find((cat) => cat.id === categoryId)
    return category?.color || "#9CA3AF"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-foreground">
            {emailDetails?.subject || "Loading Subject..."}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            From: {emailDetails?.sender || "Loading Sender..."}
            {emailDetails?.account?.email && ` (via ${emailDetails.account.email})`}
          </DialogDescription>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {emailDetails?.category && (
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `${emailDetails.category.color}15`,
                  color: emailDetails.category.color,
                  borderColor: `${emailDetails.category.color}30`,
                }}
                className="text-xs border"
              >
                {emailDetails.category.name}
              </Badge>
            )}
            {emailDetails?.ai_summary && (
              <Badge
                variant="outline"
                className="text-xs bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                AI Summary
              </Badge>
            )}
            {emailDetails?.is_read ? (
              <Badge
                variant="outline"
                className="text-xs bg-gray-50 text-gray-600 border-gray-300 flex items-center gap-1"
              >
                <MailOpen className="h-3 w-3" /> Read
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
              >
                <MailOpen className="h-3 w-3" /> Unread
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-shrink-0 flex items-center gap-2 border-b pb-3">
          <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={isUpdatingCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Change Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMarkAsReadUnread(!emailDetails?.is_read)}
            disabled={!emailDetails}
          >
            {emailDetails?.is_read ? (
              <>
                <MailOpen className="mr-2 h-4 w-4" /> Mark as Unread
              </>
            ) : (
              <>
                <MailOpen className="mr-2 h-4 w-4" /> Mark as Read
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" disabled={isDeleting} onClick={handleDeleteEmail}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isUnsubscribing}
            onClick={() => setIsUnsubscribeAlertDialogOpen(true)}
          >
            {isUnsubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
            Unsubscribe
          </Button>
        </div>

        <div className="flex-1 overflow-auto border rounded-md p-4 bg-muted/20 text-foreground">
          {isLoadingContent ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading email content...</span>
            </div>
          ) : emailContent?.htmlContent ? (
            <iframe
              srcDoc={emailContent.htmlContent}
              className="w-full h-full border-none bg-white dark:bg-background"
              title="Email Content"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-scripts"
            />
          ) : emailContent?.textContent ? (
            <pre className="whitespace-pre-wrap font-sans text-sm">{emailContent.textContent}</pre>
          ) : (
            <div className="text-center text-muted-foreground">No content available for this email.</div>
          )}
        </div>

        {emailDetails?.ai_summary && (
          <div className="flex-shrink-0 mt-4 p-3 rounded-md bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/50 dark:to-blue-950/50 border border-purple-100/50 dark:border-purple-900/50">
            <div className="flex items-center mb-1">
              <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">AI Summary</span>
            </div>
            <p className="text-sm text-purple-800 dark:text-purple-300 leading-relaxed">{emailDetails.ai_summary}</p>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={isUnsubscribeAlertDialogOpen} onOpenChange={setIsUnsubscribeAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unsubscribe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to attempt to unsubscribe from emails from "{emailDetails?.sender}"? This action
              will try to find an unsubscribe link or email and may move this email to trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubscribe} className="bg-orange-600 text-white hover:bg-orange-700">
              Confirm Unsubscribe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
