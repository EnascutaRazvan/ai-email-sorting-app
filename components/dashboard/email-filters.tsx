"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Filter, SortAsc, SortDesc } from "lucide-react"

interface Category {
  id: string
  name: string
  color: string
  email_count: number
}

interface Account {
  id: string
  email: string
  name?: string
}

interface EmailFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  sortBy: string
  onSortChange: (sort: string) => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (order: "asc" | "desc") => void
  dateRange: string
  onDateRangeChange: (range: string) => void
  accounts: Account[]
  selectedAccount: string | null
  onAccountChange: (account: string | null) => void
  categories: Category[]
  totalEmails: number
  filteredEmails: number
}

export function EmailFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  dateRange,
  onDateRangeChange,
  accounts,
  selectedAccount,
  onAccountChange,
  categories,
  totalEmails,
  filteredEmails,
}: EmailFiltersProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="sender">Sender</SelectItem>
            <SelectItem value="subject">Subject</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}>
          {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
        </Button>

        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>

        {accounts.length > 1 && (
          <Select
            value={selectedAccount || "all"}
            onValueChange={(value) => onAccountChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Badge variant="outline">
          {filteredEmails} of {totalEmails} emails
        </Badge>
      </div>
    </div>
  )
}
