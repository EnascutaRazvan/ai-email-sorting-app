"use client"

import { useState, useEffect } from "react"
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
import { useDebounce } from "@/lib/hooks/use-debounce" // Import the debounce hook

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
    categoryId: "all",
    accountId: "all",
    dateFrom: null,
    dateTo: null,
    sender: "",
  })

  // Debounced state for search and sender
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)
  const [debouncedSender, setDebouncedSender] = useState(filters.sender)

  const debouncedSearchTerm = useDebounce(debouncedSearch, 500)
  const debouncedSenderTerm = useDebounce(debouncedSender, 500)

  // Effect to update filters when debounced search/sender terms change
  useEffect(() => {
    updateFilters({ search: debouncedSearchTerm })
  }, [debouncedSearchTerm])

  useEffect(() => {
    updateFilters({ sender: debouncedSenderTerm })
  }, [debouncedSenderTerm])

  const updateFilters = (newFilters: Partial<EmailFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    onFiltersChange(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters: EmailFilters = {
      search: "",
      categoryId: "all",
      accountId: "all",
      dateFrom: null,
      dateTo: null,
      sender: "",
    }
    setFilters(clearedFilters)
    setDebouncedSearch("") // Clear debounced state too
    setDebouncedSender("") // Clear debounced state too
    onFiltersChange(clearedFilters)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.categoryId !== "all") count++
    if (filters.accountId !== "all") count++
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.sender) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Search emails..."
          value={debouncedSearch} // Bind to debounced state
          onChange={(e) => setDebouncedSearch(e.target.value)} // Update debounced state
          className="pl-4 pr-10 bg-background text-foreground border-border focus-visible:ring-primary"
        />
        {debouncedSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDebouncedSearch("")
              updateFilters({ search: "" })
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-transparent text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 w-5 rounded-full p-0 text-xs bg-primary text-primary-foreground"
                >
                  {activeFiltersCount}
                </Badge>
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4 rounded-lg border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Category</Label>
                <Select
                  value={filters.categoryId || "all"}
                  onValueChange={(value) => updateFilters({ categoryId: value })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border focus:ring-primary">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
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
                <Label className="text-sm font-medium text-foreground">Account</Label>
                <Select
                  value={filters.accountId || "all"}
                  onValueChange={(value) => updateFilters({ accountId: value })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border focus:ring-primary">
                    <SelectValue placeholder="All accounts" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
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
                <Label className="text-sm font-medium text-foreground">Sender</Label>
                <Input
                  placeholder="Filter by sender..."
                  value={debouncedSender} // Bind to debounced state
                  onChange={(e) => setDebouncedSender(e.target.value)} // Update debounced state
                  className="bg-background text-foreground border-border focus-visible:ring-primary"
                />
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
                        !filters.dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover text-popover-foreground border-border">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom || undefined}
                      onSelect={(date) => updateFilters({ dateFrom: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground",
                        !filters.dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover text-popover-foreground border-border">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo || undefined}
                      onSelect={(date) => updateFilters({ dateTo: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="bg-transparent text-foreground border-border hover:bg-accent hover:text-accent-foreground"
              >
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
          className="flex items-center gap-2 bg-transparent text-foreground border-border hover:bg-accent hover:text-accent-foreground"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          {isRecategorizing ? "Recategorizing..." : "AI Recategorize"}
        </Button>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDebouncedSearch("")
                  updateFilters({ search: "" })
                }}
              />
            </Badge>
          )}
          {filters.categoryId !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
              Category:{" "}
              {filters.categoryId === "uncategorized"
                ? "Uncategorized"
                : categories.find((c) => c.id === filters.categoryId)?.name}
              <X
                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => updateFilters({ categoryId: "all" })}
              />
            </Badge>
          )}
          {filters.accountId !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
              Account: {accounts.find((a) => a.id === filters.accountId)?.email}
              <X
                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => updateFilters({ accountId: "all" })}
              />
            </Badge>
          )}
          {filters.sender && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
              Sender: {filters.sender}
              <X
                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setDebouncedSender("")
                  updateFilters({ sender: "" })
                }}
              />
            </Badge>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-secondary text-secondary-foreground">
              Date: {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "Start"} -{" "}
              {filters.dateTo ? format(filters.dateTo, "MMM d") : "End"}
              <X
                className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => updateFilters({ dateFrom: null, dateTo: null })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
