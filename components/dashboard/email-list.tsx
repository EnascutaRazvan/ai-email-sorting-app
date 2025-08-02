"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Trash2, MailOpen, Tag, MoreHorizontal, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { EmailDetailDialog } from "./email-detail-dialog"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Email {
  id: string
  message_id: string
  thread_id: string
  subject: string
  from_email: string
  from_name: string
  to_email: string
  date: string
  snippet: string
  body_html: string | null
  body_plain: string | null
  category_id: string | null
  account_id: string | null
  disconnected_account_email: string | null // Added for disconnected accounts
  is_read: boolean
  is_unsubscribed: boolean
  created_at: string
  updated_at: string
  account_email?: string // Added for display purposes
}

interface EmailListProps {
  selectedCategoryId: string | null
  searchQuery: string
  selectedAccountId: string | null
}

export function EmailList({ selectedCategoryId, searchQuery, selectedAccountId }: EmailListProps) {
  const { data: session } = useSession()
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalEmails, setTotalEmails] = useState(0)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [openEmailDetail, setOpenEmailDetail] = useState<Email | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkUnsubscribeDialog, setShowBulkUnsubscribeDialog] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState<any[] | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkUnsubscribing, setIsBulkUnsubscribing] = useState(false)
  const { toast } = useToast()

  const fetchEmails = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setSelectedEmails(new Set()) // Clear selections on fetch
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      })
      if (selectedCategoryId && selectedCategoryId !== "all") {
        params.append("categoryId", selectedCategoryId)
      }
      if (searchQuery) {
        params.append("query", searchQuery)
      }
      if (selectedAccountId && selectedAccountId !== "all") {
        params.append("accountId", selectedAccountId)
      }

      const res = await fetch(`/api/emails?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      const data = await res.json()
      setEmails(data.emails)
      setTotalEmails(data.total)
    } catch (error) {
      console.error("Failed to fetch emails:", error)
      toast({
        title: "Error",
        description: "Failed to load emails.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [session, page, selectedCategoryId, searchQuery, selectedAccountId, toast])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  // Listen for custom event to refresh email list (e.g., after account removal)
  useEffect(() => {
    const handleRefresh = () => {
      fetchEmails()
    }
    window.addEventListener("emailListRefresh", handleRefresh)
    return () => {
      window.removeEventListener("emailListRefresh", handleRefresh)
    }
  }, [fetchEmails])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set())
    } else {
      setSelectedEmails(new Set(emails.map((email) => email.id)))
    }
  }

  const toggleSelectEmail = (emailId: string) => {
    setSelectedEmails((prev) => {
      const newSelection = new Set(prev)
      if (newSelection.has(emailId)) {
        newSelection.delete(emailId)
      } else {
        newSelection.add(emailId)
      }
      return newSelection
    })
  }

  const handleMarkAsRead = async (emailId: string) => {
    try {
      const res = await fetch(`/api/emails/${emailId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      setEmails((prev) => prev.map((email) => (email.id === emailId ? { ...email, is_read: true } : email)))
      toast({ title: "Email Marked as Read", description: "The email has been marked as read." })
    } catch (error) {
      console.error("Error marking as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark email as read.",
        variant: "destructive",
      })
    }
  }

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true)
    try {
      const res = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })
      if (!res.ok) throw new Error("Failed to delete emails")
      await fetchEmails() // Re-fetch emails to update the list
      toast({
        title: "Emails Deleted",
        description: `${selectedEmails.size} emails have been moved to trash.`,
      })
      setSelectedEmails(new Set())
    } catch (error) {
      console.error("Error bulk deleting:", error)
      toast({
        title: "Error",
        description: "Failed to delete selected emails.",
        variant: "destructive",
      })
    } finally {
      setIsBulkDeleting(false)
      setShowBulkDeleteDialog(false)
    }
  }

  const handleBulkUnsubscribe = async () => {
    setIsBulkUnsubscribing(true)
    try {
      const res = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to unsubscribe from emails")
      }
      const results = await res.json()
      setUnsubscribeResults(results)
      setShowBulkUnsubscribeDialog(true)
      await fetchEmails() // Re-fetch emails to update the list
      setSelectedEmails(new Set())
    } catch (error: any) {
      console.error("Error bulk unsubscribing:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to unsubscribe from selected emails.",
        variant: "destructive",
      })
    } finally {
      setIsBulkUnsubscribing(false)
    }
  }

  const handleRecategorize = async (emailId: string, newCategoryId: string) => {
    try {
      const res = await fetch("/api/emails/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: [emailId], categoryId: newCategoryId }),
      })
      if (!res.ok) throw new Error("Failed to recategorize email")
      setEmails((prev) =>
        prev.map((email) => (email.id === emailId ? { ...email, category_id: newCategoryId } : email)),
      )
      toast({ title: "Email Recategorized", description: "The email has been moved to a new category." })
    } catch (error) {
      console.error("Error recategorizing:", error)
      toast({
        title: "Error",
        description: "Failed to recategorize email.",
        variant: "destructive",
      })
    }
  }

  const totalPages = Math.ceil(totalEmails / 20)

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="p-0 flex-grow flex flex-col">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex-grow flex items-center justify-center text-gray-500">
            No emails found for the current filters.
          </div>
        ) : (
          <>
            <div className="flex items-center p-4 border-b">
              <Checkbox
                checked={selectedEmails.size === emails.length && emails.length > 0}
                onCheckedChange={toggleSelectAll}
                disabled={emails.length === 0}
                aria-label="Select all emails"
              />
              <span className="ml-2 text-sm text-gray-600">
                {selectedEmails.size > 0 ? `${selectedEmails.size} selected` : "Select All"}
              </span>
              {selectedEmails.size > 0 && (
                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDeleteDialog(true)}
                    disabled={isBulkDeleting}
                  >
                    {isBulkDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkUnsubscribe()}
                    disabled={isBulkUnsubscribing}
                  >
                    {isBulkUnsubscribing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MailOpen className="mr-2 h-4 w-4" />
                    )}
                    Unsubscribe
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-grow overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[200px]">From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-[150px]">Account</TableHead>
                    <TableHead className="w-[150px] text-right">Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow
                      key={email.id}
                      className={`cursor-pointer ${!email.is_read ? "font-semibold bg-blue-50/50" : ""}`}
                      onClick={() => {
                        setOpenEmailDetail(email)
                        if (!email.is_read) handleMarkAsRead(email.id)
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={() => toggleSelectEmail(email.id)}
                          aria-label={`Select email from ${email.from_name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {email.is_unsubscribed && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-gray-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>You have unsubscribed from this sender.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {email.from_name || email.from_email}
                        </div>
                      </TableCell>
                      <TableCell>{email.subject}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm text-gray-500 truncate max-w-[120px] block">
                                {email.account_email || "Unknown Account"}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{email.account_email || "This email's account is unknown."}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">{new Date(email.date).toLocaleDateString()}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleMarkAsRead(email.id)}>
                              <MailOpen className="mr-2 h-4 w-4" /> Mark as Read
                            </DropdownMenuItem>
                            {/* Add recategorize options here if categories are dynamic */}
                            <DropdownMenuItem onClick={() => handleRecategorize(email.id, "some_category_id")}>
                              <Tag className="mr-2 h-4 w-4" /> Recategorize
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedEmails(new Set([email.id]))
                                setShowBulkDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination className="py-4 border-t">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <Button
                      variant={pageNumber === page ? "default" : "outline"}
                      size="icon"
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        )}
      </CardContent>

      {openEmailDetail && <EmailDetailDialog email={openEmailDetail} onClose={() => setOpenEmailDetail(null)} />}

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmails.size} selected emails? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {unsubscribeResults && (
        <UnsubscribeResultsDialog results={unsubscribeResults} onClose={() => setUnsubscribeResults(null)} />
      )}
    </Card>
  )
}
