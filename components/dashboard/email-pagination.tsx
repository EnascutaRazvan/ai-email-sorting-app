"use client"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"

interface EmailPaginationProps {
  currentPage: number
  totalEmails: number
  emailsPerPage: number
  onPageChange: (page: number) => void
}

export function EmailPagination({ currentPage, totalEmails, emailsPerPage, onPageChange }: EmailPaginationProps) {
  const totalPages = Math.ceil(totalEmails / emailsPerPage)

  if (totalPages <= 1) {
    return null // Don't show pagination if there's only one page or no emails
  }

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    const maxPagesToShow = 5 // Number of page links to show directly

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      // Determine if ellipsis is needed at the start
      if (currentPage > Math.floor(maxPagesToShow / 2) + 1) {
        pages.push("ellipsis")
      }

      // Show pages around the current page
      let startPage = Math.max(2, currentPage - Math.floor(maxPagesToShow / 2) + 1)
      let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPagesToShow / 2) - 1)

      if (currentPage <= Math.floor(maxPagesToShow / 2) + 1) {
        endPage = maxPagesToShow - 1
      } else if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
        startPage = totalPages - maxPagesToShow + 2
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Determine if ellipsis is needed at the end
      if (currentPage < totalPages - Math.floor(maxPagesToShow / 2)) {
        pages.push("ellipsis")
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} />
        </PaginationItem>
        {pageNumbers.map((page, index) => (
          <PaginationItem key={index}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink isActive={page === currentPage} onClick={() => onPageChange(page as number)}>
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
