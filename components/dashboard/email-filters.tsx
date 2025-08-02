"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Filter, ChevronDown, X, CalendarIcon, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface EmailFiltersProps {
  onFiltersChange: (filters: EmailFilters) => void
  accounts: Array<{ id: string; email: string }>
  categories: Array<{ id: string; name: string; color: string }>
  onRecategorize: () => void
  isRecategorizing: boolean
}

export interface EmailFilters {
  search: string
  categoryId: string | null
  accountId: string | null
  dateFrom: Date | null
  dateTo: Date | null
  sender: string
  isRead: boolean | "all"
}

export function EmailFilters({
  onFiltersChange,
  accounts,
  categories,
  onRecategorize,
  isRecategorizing,
}: EmailFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<EmailFilters>({
    search: "",
    categoryId: "all", // Updated default value
    accountId: "all", // Updated default value
    dateFrom: null,
    dateTo: null,
    sender: "",
    isRead: "all",
  })

  const updateFilters = (newFilters: Partial<EmailFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters: EmailFilters = {
      search: "",
      categoryId: "all", // Updated default value
      accountId: "all", // Updated default value
      dateFrom: null,
      dateTo: null,
      sender: "",
      isRead: "all",
    }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.categoryId !== "all") count++
    if (filters.accountId !== "all") count++
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.sender) count++
    if (filters.isRead !== "all") count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search emails..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-4 pr-10"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => updateFilters({ search: "" })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4 rounded-lg border bg-card p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={filters.categoryId || "all"}
                  onValueChange={(value) => updateFilters({ categoryId: value === "all" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
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
              </div>

              {/* Account Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account</Label>
                <Select
                  value={filters.accountId || "all"}
                  onValueChange={(value) => updateFilters({ accountId: value === "all" ? null : value })}
                >
                  <SelectTrigger>
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
              </div>

              {/* Sender Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sender</Label>
                <Input
                  placeholder="Filter by sender..."
                  value={filters.sender}
                  onChange={(e) => updateFilters({ sender: e.target.value })}
                />
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilters({ dateFrom: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !filters.dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilters({ dateTo: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Read Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Read Status</Label>
                <Select
                  value={String(filters.isRead)}
                  onValueChange={(value) =>
                    updateFilters({ isRead: value === "true" ? true : value === "false" ? false : "all" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Read</SelectItem>
                    <SelectItem value="false">Unread</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* AI Recategorize Button */}
        <Button
          onClick={onRecategorize}
          disabled={isRecategorizing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-transparent"
        >
          <Sparkles className="h-4 w-4" />
          {isRecategorizing ? "Recategorizing..." : "AI Recategorize"}
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {filters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ search: "" })} />
            </Badge>
          )}
          {filters.categoryId !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category:{" "}
              {filters.categoryId === "uncategorized"
                ? "Uncategorized"
                : categories.find((c) => c.id === filters.categoryId)?.name}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ categoryId: "all" })} />
            </Badge>
          )}
          {filters.accountId !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Account: {accounts.find((a) => a.id === filters.accountId)?.email}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ accountId: "all" })} />
            </Badge>
          )}
          {filters.sender && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Sender: {filters.sender}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ sender: "" })} />
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "Start"} -{" "}
              {filters.dateTo ? format(filters.dateTo, "MMM d") : "End"}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ dateFrom: null, dateTo: null })} />
            </Badge>
          )}
          {filters.isRead !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.isRead ? "Read" : "Unread"}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilters({ isRead: "all" })} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
