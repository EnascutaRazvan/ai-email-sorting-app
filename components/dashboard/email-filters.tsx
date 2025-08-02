"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, Calendar, User, Tag, SortAsc, SortDesc, X } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"

interface EmailFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCategory: string | null
  onCategoryChange: (categoryId: string | null) => void
  sortBy: string
  onSortChange: (sortBy: string) => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (order: "asc" | "desc") => void
  dateRange: string
  onDateRangeChange: (range: string) => void
  accounts: Array<{ id: string; email: string }>
  selectedAccount: string | null
  onAccountChange: (accountId: string | null) => void
  categories: Array<{ id: string; name: string; color: string }>
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
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300)

  // Update parent when debounced search changes
  useEffect(() => {
    onSearchChange(debouncedSearchQuery)
  }, [debouncedSearchQuery, onSearchChange])

  // Update local search when prop changes (for external updates)
  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  const hasActiveFilters = selectedCategory || selectedAccount || dateRange !== "all" || localSearchQuery

  const clearAllFilters = () => {
    setLocalSearchQuery("")
    onCategoryChange(null)
    onAccountChange(null)
    onDateRangeChange("all")
  }

  const getSelectedCategoryName = () => {
    if (!selectedCategory) return null
    const category = categories.find((cat) => cat.id === selectedCategory)
    return category?.name || null
  }

  const getSelectedAccountEmail = () => {
    if (!selectedAccount) return null
    const account = accounts.find((acc) => acc.id === selectedAccount)
    return account?.email || null
  }

  return (
    <div className="space-y-4">
      {/* Search and Primary Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails by subject, sender, or content..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-10 pr-4"
          />
          {localSearchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setLocalSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="sender">Sender</SelectItem>
              <SelectItem value="subject">Subject</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
            className="px-2"
          >
            {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>

        {/* Advanced Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="relative bg-transparent">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-primary" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Category Filter */}
            <DropdownMenuItem className="flex flex-col items-start p-3">
              <div className="flex items-center w-full mb-2">
                <Tag className="mr-2 h-4 w-4" />
                <span className="text-sm font-medium">Category</span>
              </div>
              <Select
                value={selectedCategory || "all"}
                onValueChange={(value) => onCategoryChange(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Account Filter */}
            <DropdownMenuItem className="flex flex-col items-start p-3">
              <div className="flex items-center w-full mb-2">
                <User className="mr-2 h-4 w-4" />
                <span className="text-sm font-medium">Account</span>
              </div>
              <Select
                value={selectedAccount || "all"}
                onValueChange={(value) => onAccountChange(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full">
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
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Date Range Filter */}
            <DropdownMenuItem className="flex flex-col items-start p-3">
              <div className="flex items-center w-full mb-2">
                <Calendar className="mr-2 h-4 w-4" />
                <span className="text-sm font-medium">Date Range</span>
              </div>
              <Select value={dateRange} onValueChange={onDateRangeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="quarter">This quarter</SelectItem>
                  <SelectItem value="year">This year</SelectItem>
                </SelectContent>
              </Select>
            </DropdownMenuItem>

            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearAllFilters} className="text-destructive">
                  <X className="mr-2 h-4 w-4" />
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {localSearchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              Search: "{localSearchQuery}"
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => setLocalSearchQuery("")}>
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          {selectedCategory && getSelectedCategoryName() && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Category: {getSelectedCategoryName()}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => onCategoryChange(null)}>
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          {selectedAccount && getSelectedAccountEmail() && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Account: {getSelectedAccountEmail()}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => onAccountChange(null)}>
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          {dateRange !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date: {dateRange}
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-1" onClick={() => onDateRangeChange("all")}>
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-destructive hover:text-destructive"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredEmails.toLocaleString()} of {totalEmails.toLocaleString()} emails
        </span>
        {hasActiveFilters && (
          <span className="text-primary">
            {((filteredEmails / totalEmails) * 100).toFixed(1)}% of emails match your filters
          </span>
        )}
      </div>
    </div>
  )
}
