"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ArrowDownUp,
  Mail,
  Filter,
  Trash,
  RefreshCcw,
  UnlinkIcon as Unsubscribe,
  Bot,
  ChevronDown,
  Eye,
} from "lucide-react"
import { EmailDetailDialog } from "./email-detail-dialog"
import { useToast } from "@/components/ui/use-toast"
import { EmailPagination } from "./email-pagination"
import { UnsubscribeResultsDialog } from "./unsubscribe-results-dialog"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface Email {
  id: string
  subject: string
  sender: string
  date: string
  is_read: boolean
  category_id: string | null
  category_name: string | null
  category_color: string | null
  account_email: string
  is_ai_suggested?: boolean
}

interface Category {
  id: string
  name: string
  color: string
}

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: Array<{
    link: { url: string; text: string; method: string }
    result: {
      success: boolean
      method: string
      error?: string
      details?: string
      screenshot?: string
    }
  }>
}

export function EmailList({
  initialEmails,
  categories,
  accounts,
  onEmailDeleted,
  onEmailCategorized,
  onEmailsRecategorized,
  onEmailsUnsubscribed,
}: {
  initialEmails: Email[]
  categories: Category[]
  accounts: { id: string; email: string }[]
  onEmailDeleted: (emailIds: string[]) => void
  onEmailCategorized: (emailId: string, categoryId: string | null) => void
  onEmailsRecategorized: (updatedEmails: { id: string; category_id: string }[]) => void
  onEmailsUnsubscribed: (unsubscribedEmailIds: string[]) => void
}) {
  const [emails, setEmails] = useState<Email[]>(initialEmails)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all")
  const [selectedAccount, setSelectedAccount] = useState<string | "all">("all")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc") // 'desc' for newest first
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [emailsPerPage, setEmailsPerPage] = useState(10)
  const { toast } = useToast()
  const [isUnsubscribeResultsDialogOpen, setIsUnsubscribeResultsDialogOpen] = useState(false)
  const [unsubscribeResults, setUnsubscribeResults] = useState<UnsubscribeResult[]>([])
  const [totalProcessedUnsubscribes, setTotalProcessedUnsubscribes] = useState(0)
  const [totalSuccessfulUnsubscribes, setTotalSuccessfulUnsubscribes] = useState(0)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [isConfirmUnsubscribeOpen, setIsConfirmUnsubscribeOpen] = useState(false)

  // Filter states
  const [filterDateRange, setFilterDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [filterIsRead, setFilterIsRead] = useState<boolean | "all">("all")
  const [filterHasAttachment, setFilterHasAttachment] = useState<boolean | "all">("all")

  useEffect(() => {
    setEmails(initialEmails)
    setSelectedEmails(new Set()) // Clear selection when emails change
  }, [initialEmails])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allEmailIds = filteredEmails.map((email) => email.id)
      setSelectedEmails(new Set(allEmailIds))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    setSelectedEmails((prev) => {
      const newSelection = new Set(prev)
      if (checked) {
        newSelection.add(emailId)
      } else {
        newSelection.delete(emailId)
      }
      return newSelection
    })
  }

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email)
    setIsDetailDialogOpen(true)
  }

  const handleEmailDetailClose = () => {
    setIsDetailDialogOpen(false)
    setSelectedEmail(null)
  }

  const handleCategorize = async (emailId: string, categoryId: string | null) => {
    try {
      const response = await fetch(`/api/emails/${emailId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: categoryId }),
      })

      if (!response.ok) {
        throw new Error("Failed to categorize email")
      }

      setEmails((prev) => prev.map((email) => (email.id === emailId ? { ...email, category_id: categoryId } : email)))
      onEmailCategorized(emailId, categoryId)
      toast({
        title: "Email Categorized",
        description: `Email moved to ${categories.find((c) => c.id === categoryId)?.name || "Uncategorized"}.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to categorize email.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSelected = async () => {
    setIsConfirmDeleteOpen(false)
    if (selectedEmails.size === 0) return

    try {
      const response = await fetch("/api/emails/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete emails")
      }

      const deletedIds = Array.from(selectedEmails)
      setEmails((prev) => prev.filter((email) => !selectedEmails.has(email.id)))
      onEmailDeleted(deletedIds)
      setSelectedEmails(new Set())
      toast({
        title: "Emails Deleted",
        description: `${deletedIds.length} emails have been deleted.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete emails.",
        variant: "destructive",
      })
    }
  }

  const handleRecategorizeWithAI = async () => {
    try {
      toast({
        title: "Recategorizing Emails",
        description: "AI is working to recategorize your emails. This may take a moment.",
      })

      const response = await fetch("/api/emails/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (!response.ok) {
        throw new Error("Failed to recategorize emails with AI")
      }

      const { updatedEmails } = await response.json()
      setEmails((prev) =>
        prev.map((email) => {
          const updated = updatedEmails.find((ue: { id: string }) => ue.id === email.id)
          if (updated) {
            const newCategory = categories.find((cat) => cat.id === updated.category_id)
            return {
              ...email,
              category_id: updated.category_id,
              category_name: newCategory?.name || null,
              category_color: newCategory?.color || null,
              is_ai_suggested: true, // Mark as AI suggested after recategorization
            }
          }
          return email
        }),
      )
      onEmailsRecategorized(updatedEmails)
      setSelectedEmails(new Set())
      toast({
        title: "AI Recategorization Complete",
        description: `${updatedEmails.length} emails have been recategorized by AI.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to recategorize emails with AI.",
        variant: "destructive",
      })
    }
  }

  const handleUnsubscribeSelected = async () => {
    setIsConfirmUnsubscribeOpen(false)
    if (selectedEmails.size === 0) return

    toast({
      title: "Unsubscribing from Emails",
      description: "The AI agent is working to unsubscribe from selected emails. This may take a while.",
    })

    try {
      const response = await fetch("/api/emails/bulk-unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      })

      if (!response.ok) {
        throw new Error("Failed to unsubscribe from emails")
      }

      const { results, totalProcessed, totalSuccessful } = await response.json()
      setUnsubscribeResults(results)
      setTotalProcessedUnsubscribes(totalProcessed)
      setTotalSuccessfulUnsubscribes(totalSuccessful)
      setIsUnsubscribeResultsDialogOpen(true)

      // Remove successfully unsubscribed emails from the list
      const unsubscribedEmailIds = results
        .filter((r: UnsubscribeResult) => r.success)
        .map((r: UnsubscribeResult) => r.emailId)
      setEmails((prev) => prev.filter((email) => !unsubscribedEmailIds.includes(email.id)))
      onEmailsUnsubscribed(unsubscribedEmailIds)
      setSelectedEmails(new Set())

      toast({
        title: "Unsubscribe Process Complete",
        description: `Processed ${totalProcessed} emails, ${totalSuccessful} successful unsubscribes.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unsubscribe from emails.",
        variant: "destructive",
      })
    }
  }

  const filteredEmails = useMemo(() => {
    let filtered = emails || []

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (email) =>
          email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.sender.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((email) => email.category_id === selectedCategory)
    }

    // Account filter
    if (selectedAccount !== "all") {
      filtered = filtered.filter((email) => email.account_email === selectedAccount)
    }

    // Date range filter
    if (filterDateRange.from || filterDateRange.to) {
      filtered = filtered.filter((email) => {
        const emailDate = parseISO(email.date)
        if (filterDateRange.from && emailDate < filterDateRange.from) {
          return false
        }
        if (filterDateRange.to && emailDate > filterDateRange.to) {
          return false
        }
        return true
      })
    }

    // Is Read filter
    if (filterIsRead !== "all") {
      filtered = filtered.filter((email) => email.is_read === filterIsRead)
    }

    // Has Attachment filter (assuming emails have an `has_attachment` property, which is not in the current Email interface)
    // For now, this filter will not do anything unless `has_attachment` is added to the Email type and data.
    // if (filterHasAttachment !== "all") {
    //   filtered = filtered.filter((email) => email.has_attachment === filterHasAttachment);
    // }

    // Sort
    if (filtered && filtered.length > 0) {
      filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB
      })
    }

    return filtered
  }, [
    emails,
    searchTerm,
    selectedCategory,
    selectedAccount,
    sortOrder,
    filterDateRange,
    filterIsRead,
    filterHasAttachment,
  ])

  // Pagination logic
  const totalPages = Math.ceil(filteredEmails.length / emailsPerPage)
  const paginatedEmails = useMemo(() => {
    const startIndex = (currentPage - 1) * emailsPerPage
    const endIndex = startIndex + emailsPerPage
    return filteredEmails.slice(startIndex, endIndex)
  }, [filteredEmails, currentPage, emailsPerPage])

  useEffect(() => {
    // Reset to first page if filters change
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedAccount, filterDateRange, filterIsRead, filterHasAttachment])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleEmailsPerPageChange = useCallback((value: string) => {
    setEmailsPerPage(Number(value))
    setCurrentPage(1) // Reset to first page when items per page changes
  }, [])

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized"
    return categories.find((c) => c.id === categoryId)?.name || "Unknown Category"
  }

  const getCategoryColor = (categoryId: string | null) => {
    if (!categoryId) return "bg-gray-200 text-gray-800" // Default for Uncategorized
    return categories.find((c) => c.id === categoryId)?.color || "bg-gray-200 text-gray-800"
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-1">Category</h4>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Account</h4>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.email}>
                          {account.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Date Range</h4>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                        {filterDateRange.from ? (
                          filterDateRange.to ? (
                            <>
                              {format(filterDateRange.from, "LLL dd, y")} - {format(filterDateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(filterDateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={filterDateRange}
                        onSelect={setFilterDateRange}
                        numberOfMonths={2}
                      />
                      <div className="p-2 flex justify-end">
                        <Button variant="ghost" onClick={() => setFilterDateRange({})}>
                          Clear
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-1">Read Status</h4>
                  <Select
                    value={String(filterIsRead)}
                    onValueChange={(val) => setFilterIsRead(val === "true" ? true : val === "false" ? false : "all")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="false">Unread</SelectItem>
                      <SelectItem value="true">Read</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center space-x-2">
          {selectedEmails.size > 0 && (
            <>
              <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(true)}>
                <Trash className="h-4 w-4 mr-2" />
                Delete ({selectedEmails.size})
              </Button>
              <Button variant="outline" onClick={() => setIsConfirmUnsubscribeOpen(true)}>
                <Unsubscribe className="h-4 w-4 mr-2" />
                Unsubscribe ({selectedEmails.size})
              </Button>
              <Button variant="outline" onClick={handleRecategorizeWithAI}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Recategorize with AI ({selectedEmails.size})
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}>
            <ArrowDownUp className="h-4 w-4" />
            <span className="sr-only">Sort by Date</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {paginatedEmails.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No emails found matching your criteria.</div>
        ) : (
          <div className="divide-y">
            {paginatedEmails.map((email) => (
              <div
                key={email.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedEmails.has(email.id)}
                  onCheckedChange={(checked) => handleSelectEmail(email.id, checked as boolean)}
                />
                <div className="flex-1 grid gap-1" onClick={() => handleEmailClick(email)}>
                  <div className="flex items-center justify-between">
                    <div className="font-medium flex items-center gap-2">
                      {email.sender}
                      {email.is_ai_suggested && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-dashed flex items-center gap-1">
                          <Bot className="h-3 w-3" /> AI Suggested
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(email.date), "MMM dd, yyyy hh:mm a")}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">{email.subject}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className="px-2 py-0.5" style={{ backgroundColor: getCategoryColor(email.category_id) }}>
                      {getCategoryName(email.category_id)}
                    </Badge>
                    <Badge variant="secondary" className="px-2 py-0.5">
                      {email.account_email}
                    </Badge>
                    {email.is_read && (
                      <Badge variant="outline" className="px-2 py-0.5">
                        Read
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <ChevronDown className="h-4 w-4" />
                      <span className="sr-only">More actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEmailClick(email)}>
                      <Eye className="h-4 w-4 mr-2" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCategorize(email.id, null)}>
                      <Mail className="h-4 w-4 mr-2" /> Mark Uncategorized
                    </DropdownMenuItem>
                    {categories.map((category) => (
                      <DropdownMenuItem key={category.id} onClick={() => handleCategorize(email.id, category.id)}>
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        />
                        Categorize as {category.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      <EmailPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        emailsPerPage={emailsPerPage}
        onEmailsPerPageChange={handleEmailsPerPageChange}
        totalEmails={filteredEmails.length}
      />

      {selectedEmail && (
        <EmailDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={handleEmailDetailClose}
          email={selectedEmail}
          onCategorize={handleCategorize}
          categories={categories}
        />
      )}

      <UnsubscribeResultsDialog
        isOpen={isUnsubscribeResultsDialogOpen}
        onClose={() => setIsUnsubscribeResultsDialogOpen(false)}
        results={unsubscribeResults}
        totalProcessed={totalProcessedUnsubscribes}
        totalSuccessful={totalSuccessfulUnsubscribes}
      />

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmails.size} selected emails? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmUnsubscribeOpen} onOpenChange={setIsConfirmUnsubscribeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Unsubscribe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to attempt to unsubscribe from {selectedEmails.size} selected emails? The AI agent
              will visit the unsubscribe links. This process may take some time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubscribeSelected}>Unsubscribe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
