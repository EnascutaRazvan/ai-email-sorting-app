"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface EmailPaginationProps {
  currentPage: number
  totalPages: number
  totalEmails: number
  emailsPerPage: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}

export function EmailPagination({
  currentPage,
  totalPages,
  totalEmails,
  emailsPerPage,
  onPageChange,
  onLimitChange,
}: EmailPaginationProps) {
  const startEmail = (currentPage - 1) * emailsPerPage + 1
  const endEmail = Math.min(currentPage * emailsPerPage, totalEmails)

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

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white/50 backdrop-blur-sm border-t border-gray-200/50">
      {/* Results info */}
      <div className="flex items-center space-x-4">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{startEmail}</span> to <span className="font-medium">{endEmail}</span>{" "}
          of <span className="font-medium">{totalEmails}</span> emails
        </p>

        {/* Emails per page selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Show:</span>
          <Select value={emailsPerPage.toString()} onValueChange={(value) => onLimitChange(Number.parseInt(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1">
        {/* First page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {getVisiblePages().map((page, index) => (
          <Button
            key={index}
            variant={page === currentPage ? "default" : "ghost"}
            size="sm"
            onClick={() => typeof page === "number" && onPageChange(page)}
            disabled={page === "..."}
            className="h-8 w-8 p-0"
          >
            {page}
          </Button>
        ))}

        {/* Next page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
