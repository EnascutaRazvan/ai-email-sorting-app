"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from "date-fns"
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Trash, Eye, EyeOff, Loader2, MailX } from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"
import { EmailFilters, type EmailFilters as EmailFiltersType } from "./email-filters"
import { useToast } from "@/components/ui/use-toast"
import { EmailImportButton } from "./email-import-button"
import { EmailPagination } from "./email-pagination"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"

interface Email {
  id: string
  subject: string
  sender: string
  sender_email: string
  snippet: string
  received_at: string
  is_read: boolean
  category_id: string | null
  account_id: string
  full_content?: string
  category: { id: string; name: string; color: string } | null
  account: { email: string; name?: string } | null
}

interface Category {
  id: string
  name: string
  color: string
}

interface Account {
  id: string
  email: string
  name?: string
}

interface EmailListProps {
  selectedCategory: string | null
  accounts: Account[]
  categories: Category[]
  onEmailDeleted: () => void
  onEmailCategorized: () => void
  onEmailsRecategorized: () => void
  onEmailsUnsubscribed: () => void
}

export function EmailList({
  selectedCategory,
  accounts,
  categories,
  onEmailDeleted,
  onEmailCategorized,
  onEmailsRecategorized,
  onEmailsUnsubscribed,
}: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [openEmail, setOpenEmail] = useState<Email | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState<any[] | null>(null)
  const [isUnsubscribeResultsDialogOpen, setIsUnsubscribeResultsDialogOpen] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [emailsPerPage] = useState(10)
  const [totalEmails, setTotalEmails] = useState(0)
  const [filters, setFilters] = useState<EmailFiltersType>({
    search: "",
    categoryId: "all",
    accountId: "all",
    dateFrom: null,
    dateTo: null,
    sender: "",
    isRead: "all",
  })
  const [sortBy, setSortBy] = useState("received_at")
  const [sortOrder, setSortOrder] = useState("desc") // 'asc' or 'desc'

  const { toast } = useToast()

  const fetchEmails = useCallback(async () => {
    setIsLoading(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.append("page", currentPage.toString())
      queryParams.append("limit", emailsPerPage.toString())
      queryParams.append("sortBy", sortBy)
      queryParams.append("sortOrder", sortOrder)

      if (selectedCategory && selectedCategory !== "all") {
        queryParams.append("category", selectedCategory)
      } else if (filters.categoryId && filters.categoryId !== "all") {
        queryParams.append("category", filters.categoryId)
      }

      if (filters.accountId && filters.accountId !== "all") {
        queryParams.append("account", filters.accountId)
      }
      if (filters.dateFrom) {
        queryParams.append("dateFrom", filters.dateFrom.toISOString())
      }
      if (filters.dateTo) {
        queryParams.append("dateTo", filters.dateTo.toISOString())
      }
      if (filters.sender) {
        queryParams.append("sender", filters.sender)
      }
      if (filters.search) {
        queryParams.append("search", filters.search)
      }
      if (filters.isRead !== "all") {
        queryParams.append("isRead", String(filters.isRead))
      }

      const response = await fetch(`/api/emails?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch emails")
      }
      const data = await response.json()
      setEmails(data.emails || [])
      setTotalEmails(data.totalCount || 0)
      setSelectedEmails([]) // Clear selection on new fetch
    } catch (error: any) {
      console.error("Error fetching emails:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load emails.",
        variant: "destructive",
      })
      setEmails([])
      setTotalEmails(0)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, emailsPerPage, selectedCategory, filters, sortBy, sortOrder, toast])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const handleFilterChange = useCallback((newFilters: EmailFiltersType) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page on filter change
  }, [])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc") // Default sort order for new column
    }
    setCurrentPage(1) // Reset to first page on sort change
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(emails.map((email) => email.id))
    } else {
      setSelectedEmails([])
    }
  }

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmails((prev) => [...prev, emailId])
    } else {
      setSelectedEmails((prev) => prev.filter((id) => id !== emailId))
    }
  }

  const handleOpenEmail = (email: Email) => {
    setOpenEmail(email)
  }

  const handleCloseEmailDetail = () => {
    setOpenEmail(null)
    fetchEmails() // Refresh emails to update read status
  }

  const handleCategorizeEmail = async (emailId: string, categoryId: string | null) => {
    try {
      const response = await fetch(`/api/emails/${emailId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId }),
      })

      if (!response.ok) {
        throw new Error("Failed to categorize email")
      }

      toast({
        title: "Email Categorized",
        description: "The email has been successfully categorized.",
      })
      setOpenEmail(null) // Close dialog after categorizing
      onEmailCategorized() // Notify parent to refresh categories and email list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to categorize email.",
        variant: "destructive",
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedEmails.length === 0) {
      toast({
        title: "No Emails Selected",
        description: "Please select emails to delete.",
        variant: "info",
      })
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: selectedEmails }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete emails")
      }

      toast({
        title: "Emails Deleted",
        description: `Successfully deleted ${selectedEmails.length} emails.`,
      })
      setSelectedEmails([])
      onEmailDeleted() // Notify parent to refresh email list and categories
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete emails.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkRecategorize = async () => {
    if (selectedEmails.length === 0) {
      toast({
        title: "No Emails Selected",
        description: "Please select emails to recategorize.",
        variant: "info",
      })
      return
    }

    setIsRecategorizing(true)
    toast({
      title: "Recategorizing Emails",
      description: "AI is analyzing and recategorizing selected emails. This may take a moment.",
    })
    try {
      const response = await fetch("/api/emails/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: selectedEmails }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to recategorize emails")
      }

      const data = await response.json()
      toast({
        title: "Recategorization Complete",
        description: `Successfully recategorized ${data.updatedEmails.length} emails.`,
      })
      setSelectedEmails([])
      onEmailsRecategorized() // Notify parent to refresh email list and categories
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to recategorize emails.",
        variant: "destructive",
      })
    } finally {
      setIsRecategorizing(false)
    }
  }

  const handleBulkUnsubscribe = async () => {
    if (selectedEmails.length === 0) {
      toast({
        title: "No Emails Selected",
        description: "Please select emails to unsubscribe from.",
        variant: "info",
      })
      return
    }

    setIsUnsubscribing(true)
    toast({
      title: "Unsubscribing from Emails",
      description: "The unsubscribe agent is working. This may take some time.",
    })
    try {
      const response = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: selectedEmails }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to unsubscribe from emails")
      }

      const data = await response.json()
      setUnsubscribeResults(data.results)
      setIsUnsubscribeResultsDialogOpen(true)
      toast({
        title: "Unsubscribe Process Complete",
        description: `Processed ${data.totalProcessed} emails. ${data.totalSuccessful} successful unsubscribes.`,
      })
      setSelectedEmails([])
      onEmailsUnsubscribed() // Notify parent to refresh email list and categories
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unsubscribe from emails.",
        variant: "destructive",
      })
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return "#9ca3af" // Default gray for uncategorized
    return categories.find((c) => c.id === categoryId)?.color || "#9ca3af"
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    return categories.find((c) => c.id === categoryId)?.name || "Unknown"
  }

  const getAccountEmail = (accountId: string) => {
    return accounts.find((a) => a.id === accountId)?.email || "Unknown Account"
  }

  const sortedEmails = useMemo(() => {
    if (!emails || emails.length === 0) return []

    // The sorting is now handled by the API, so we just return the emails as is.
    // This memoization is still useful to prevent unnecessary re-renders if `emails` array reference doesn't change.
    return emails
  }, [emails])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Emails</h2>
        <div className="flex gap-2">
          <EmailImportButton accounts={accounts} onImportComplete={fetchEmails} />
        </div>
      </div>

      <EmailFilters
        onFiltersChange={handleFilterChange}
        accounts={accounts}
        categories={categories}
        onRecategorize={handleBulkRecategorize}
        isRecategorizing={isRecategorizing}
      />

      {selectedEmails.length > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm">
          <span>{selectedEmails.length} emails selected.</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
            {isDeleting ? "Deleting..." : "Delete Selected"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkUnsubscribe} disabled={isUnsubscribing}>
            {isUnsubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailX className="mr-2 h-4 w-4" />}
            {isUnsubscribing ? "Unsubscribing..." : "Unsubscribe Selected"}
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedEmails.length === emails.length && emails.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all emails"
                />
              </TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("is_read")}>
                Status
                {sortBy === "is_read" &&
                  (sortOrder === "asc" ? (
                    <ArrowUpNarrowWide className="ml-1 inline h-4 w-4" />
                  ) : (
                    <ArrowDownNarrowWide className="ml-1 inline h-4 w-4" />
                  ))}
              </TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("subject")}>
                Subject
                {sortBy === "subject" &&
                  (sortOrder === "asc" ? (
                    <ArrowUpNarrowWide className="ml-1 inline h-4 w-4" />
                  ) : (
                    <ArrowDownNarrowWide className="ml-1 inline h-4 w-4" />
                  ))}
              </TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("sender")}>
                Sender
                {sortBy === "sender" &&
                  (sortOrder === "asc" ? (
                    <ArrowUpNarrowWide className="ml-1 inline h-4 w-4" />
                  ) : (
                    <ArrowDownNarrowWide className="ml-1 inline h-4 w-4" />
                  ))}
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("received_at")}>
                Date
                {sortBy === "received_at" &&
                  (sortOrder === "asc" ? (
                    <ArrowUpNarrowWide className="ml-1 inline h-4 w-4" />
                  ) : (
                    <ArrowDownNarrowWide className="ml-1 inline h-4 w-4" />
                  ))}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  <p className="mt-2">Loading emails...</p>
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No emails found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              sortedEmails.map((email) => (
                <TableRow
                  key={email.id}
                  data-state={selectedEmails.includes(email.id) && "selected"}
                  className={!email.is_read ? "font-semibold bg-muted/20" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedEmails.includes(email.id)}
                      onCheckedChange={(checked) => handleSelectEmail(email.id, !!checked)}
                      aria-label={`Select email from ${email.sender}`}
                    />
                  </TableCell>
                  <TableCell>
                    {email.is_read ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" title="Read" />
                    ) : (
                      <Eye className="h-4 w-4 text-primary" title="Unread" />
                    )}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer font-medium hover:underline"
                    onClick={() =>
                      handleOpenEmail({
                        ...email,
                        date: email.received_at,
                        account_email: getAccountEmail(email.account_id),
                      })
                    }
                  >
                    {email.subject}
                  </TableCell>
                  <TableCell>{email.sender}</TableCell>
                  <TableCell>
                    <Badge className="px-2 py-0.5" style={{ backgroundColor: getCategoryColor(email.category_id) }}>
                      {getCategoryName(email.category_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="px-2 py-0.5">
                      {getAccountEmail(email.account_id)}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(parseISO(email.received_at), "MMM dd, yyyy")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmailPagination
        currentPage={currentPage}
        totalEmails={totalEmails}
        emailsPerPage={emailsPerPage}
        onPageChange={setCurrentPage}
      />

      {openEmail && (
        <EmailDetailDialog
          isOpen={!!openEmail}
          onClose={handleCloseEmailDetail}
          email={openEmail}
          onCategorize={handleCategorizeEmail}
          categories={categories}
        />
      )}

      {unsubscribeResults && (
        <UnsubscribeResultsDialog
          isOpen={isUnsubscribeResultsDialogOpen}
          onClose={() => setIsUnsubscribeResultsDialogOpen(false)}
          results={unsubscribeResults}
        />
      )}
    </div>
  )
}
