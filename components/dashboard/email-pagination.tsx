"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface EmailPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  emailsPerPage: number
  onEmailsPerPageChange: (value: string) => void
  totalEmails: number
}

export function EmailPagination({
  currentPage,
  totalPages,
  onPageChange,
  emailsPerPage,
  onEmailsPerPageChange,
  totalEmails,
}: EmailPaginationProps) {
  const pageNumbers = []
  const maxPageButtons = 5 // Number of page buttons to show

  if (totalPages <= maxPageButtons) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    // Always show first page
    pageNumbers.push(1)

    // Determine start and end of the middle range
    let startPage = Math.max(2, currentPage - Math.floor(maxPageButtons / 2) + 1)
    let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPageButtons / 2) - 1)

    if (currentPage <= Math.ceil(maxPageButtons / 2)) {
      endPage = maxPageButtons - 1
    } else if (currentPage >= totalPages - Math.floor(maxPageButtons / 2)) {
      startPage = totalPages - maxPageButtons + 2
    }

    // Add ellipsis if needed
    if (startPage > 2) {
      pageNumbers.push("...")
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      pageNumbers.push("...")
    }

    // Always show last page
    pageNumbers.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between p-4 border-t bg-background">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Emails per page:</span>
        <Select value={String(emailsPerPage)} onValueChange={onEmailsPerPageChange}>
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue placeholder={emailsPerPage} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="15">15</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-4">
          {totalEmails === 0 ? 0 : (currentPage - 1) * emailsPerPage + 1}-
          {Math.min(currentPage * emailsPerPage, totalEmails)} of {totalEmails} emails
        </span>
      </div>
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">First page</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        {pageNumbers.map((page, index) =>
          page === "..." ? (
            <span key={index} className="h-8 w-8 flex items-center justify-center text-sm">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(page as number)}
              className="h-8 w-8"
            >
              {page}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next page</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Last page</span>
        </Button>
      </div>
    </div>
  )
}
