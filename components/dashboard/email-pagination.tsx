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
  const startIndex = (currentPage - 1) * emailsPerPage + 1
  const endIndex = Math.min(currentPage * emailsPerPage, totalEmails)

  const getVisiblePages = () => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...")
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Showing {totalEmails} of {totalEmails} emails
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={String(emailsPerPage)} onValueChange={onEmailsPerPageChange}>
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">
          Showing {startIndex} to {endIndex} of {totalEmails} emails
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select value={String(emailsPerPage)} onValueChange={onEmailsPerPageChange}>
          <SelectTrigger className="w-16">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>

          {getVisiblePages().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className="min-w-[40px]"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>

        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  )
}
