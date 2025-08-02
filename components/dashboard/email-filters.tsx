"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Filter, CalendarIcon, X, ChevronDown, Bot, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface EmailFilters {
  search: string
  categoryIds: string[]
  accountId: string | null
  dateFrom: Date | null
  dateTo: Date | null
  sender: string
  senderEmail: string
}

interface EmailFiltersProps {
  onFiltersChange: (filters: EmailFilters) => void
  accounts: Array<{ id: string; email: string }>
  categories: Array<{ id: string; name: string; color: string }>
  onRecategorize?: () => void
  isRecategorizing?: boolean
}

export function EmailFilters({
  onFiltersChange,
  accounts,
  categories,
  onRecategorize,
  isRecategorizing = false,
}: EmailFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<EmailFilters>({
    search: "",
    categoryIds: [],
    accountId: null,
    dateFrom: null,
    dateTo: null,
    sender: "",
    senderEmail: "",
  })

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const updateFilter = (key: keyof EmailFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      categoryIds: [],
      accountId: null,
      dateFrom: null,
      dateTo: null,
      sender: "",
      senderEmail: "",
    })
  }

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.categoryIds.length > 0 ||
      filters.accountId ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.sender ||
      filters.senderEmail
    )
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.categoryIds.length > 0) count++
    if (filters.accountId) count++
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.sender) count++
    if (filters.senderEmail) count++
    return count
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search emails by subject, sender, or content..."
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Advanced Filters */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs text-gray-600 h-8">
              <Filter className="h-3 w-3 mr-1" />
              Advanced Filters
              {hasActiveFilters() && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
              <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center space-x-2">
            {onRecategorize && (
              <Button
                onClick={onRecategorize}
                disabled={isRecategorizing}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent"
              >
                {isRecategorizing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Recategorizing...
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3 mr-1" />
                    AI Recategorize
                  </>
                )}
              </Button>
            )}
            {hasActiveFilters() && (
              <Button onClick={clearFilters} variant="ghost" size="sm" className="text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <CollapsibleContent className="space-y-4 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Account</Label>
              <Select
                value={filters.accountId || "all"}
                onValueChange={(value) => updateFilter("accountId", value === "all" ? null : value)}
              >
                <SelectTrigger className="text-sm">
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
              <Label className="text-xs font-medium text-gray-700">Sender Name</Label>
              <Input
                placeholder="Filter by sender name"
                value={filters.sender}
                onChange={(e) => updateFilter("sender", e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Sender Email Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Sender Email</Label>
              <Input
                placeholder="Filter by sender email"
                value={filters.senderEmail}
                onChange={(e) => updateFilter("senderEmail", e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Date Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">From Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !filters.dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter("dateFrom", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">To Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !filters.dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter("dateTo", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {(filters.dateFrom || filters.dateTo) && (
              <Button
                onClick={() => {
                  updateFilter("dateFrom", null)
                  updateFilter("dateTo", null)
                }}
                variant="ghost"
                size="sm"
                className="text-xs text-red-600"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Date Range
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
