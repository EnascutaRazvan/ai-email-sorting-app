"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Mail, LogOut, Plus, Menu, X, Search, Trash2, Clock, Bot, RefreshCw } from "lucide-react"
import { EmailList } from "./email-list"
import { ThemeToggle } from "@/components/theme-toggle"
import { MultiAccountDialog } from "./multi-account-dialog"
import { EmailImportButton } from "./email-import-button"
import { CreateCategoryDialog } from "./create-category-dialog"
import { InitialCategoriesDialog } from "./initial-categories-dialog"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

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
  picture?: string
  is_primary: boolean
  last_sync?: string
  created_at: string
}

export function DashboardLayout() {
  const { data: session } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all")
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [showInitialCategoriesDialog, setShowInitialCategoriesDialog] = useState(false)
  const [hasCheckedInitialCategories, setHasCheckedInitialCategories] = useState(false)

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Fetch data functions
  const fetchCategories = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        const fetchedCategories = data.categories || []
        setCategories(fetchedCategories)

        // Check if we should show initial categories dialog
        if (!hasCheckedInitialCategories && fetchedCategories.length === 0) {
          setShowInitialCategoriesDialog(true)
          setHasCheckedInitialCategories(true)
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }, [session?.user?.id, hasCheckedInitialCategories])

  const fetchAccounts = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id])

  // Function to trigger email list refresh
  const triggerEmailRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    // Also dispatch event for EmailList component
    window.dispatchEvent(new CustomEvent("emailsChanged"))
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (session?.user?.id) {
      fetchCategories()
      fetchAccounts()
    }
  }, [session?.user?.id, fetchCategories, fetchAccounts])

  // Refresh data when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCategories()
      fetchAccounts()
    }
  }, [refreshTrigger, fetchCategories, fetchAccounts])

  // Listen for data changes from other components
  useEffect(() => {
    const handleDataChange = () => {
      setRefreshTrigger((prev) => prev + 1)
    }

    const handleAccountRemoved = (event: CustomEvent) => {
      const { accountId } = event.detail
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId))
      setRefreshTrigger((prev) => prev + 1)
    }

    window.addEventListener("emailsChanged", handleDataChange)
    window.addEventListener("categoriesChanged", handleDataChange)
    window.addEventListener("accountsChanged", handleDataChange)
    window.addEventListener("accountRemoved", handleAccountRemoved as EventListener)

    return () => {
      window.removeEventListener("emailsChanged", handleDataChange)
      window.removeEventListener("categoriesChanged", handleDataChange)
      window.removeEventListener("accountsChanged", handleDataChange)
      window.removeEventListener("accountRemoved", handleAccountRemoved as EventListener)
    }
  }, [])

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setSidebarOpen(false) // Close sidebar on mobile after selection
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This will move all emails to "Uncategorized".`)) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        showSuccessToast("Category Deleted", `"${categoryName}" has been deleted`)
        setRefreshTrigger((prev) => prev + 1)
        if (selectedCategory === categoryId) {
          setSelectedCategory("all")
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete category")
      }
    } catch (error) {
      showErrorToast(error, "Delete Category")
    }
  }

  const handleRemoveAccount = async (accountId: string, email: string, isPrimary: boolean) => {
    if (isPrimary) {
      showErrorToast("Cannot remove primary account", "Remove Account")
      return
    }

    if (!confirm(`Are you sure you want to remove ${email}? This will delete all associated emails.`)) {
      return
    }

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        showSuccessToast("Account Removed", `${email} has been removed`)
        setRefreshTrigger((prev) => prev + 1)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to remove account")
      }
    } catch (error) {
      showErrorToast(error, "Remove Account")
    }
  }

  const handleRecategorizeEmails = async () => {
    setIsRecategorizing(true)

    try {
      // Ensure uncategorized exists
      await fetch("/api/categories/ensure-uncategorized", { method: "POST" })

      // Fetch uncategorized email IDs
      const res = await fetch("/api/emails?category=uncategorized")
      const data = await res.json()

      if (!res.ok || !Array.isArray(data.emails)) {
        throw new Error("Could not fetch uncategorized emails")
      }

      const emailIds = data.emails.map((email) => email.id)

      if (emailIds.length === 0) {
        showSuccessToast("No uncategorized emails", "Nothing to recategorize")
        return
      }

      const response = await fetch("/api/emails/recategorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds }),
      })

      if (response.ok) {
        const result = await response.json()
        showSuccessToast("AI Recategorization Complete", `Updated ${result.updated} emails with AI suggestions`)

        // Refresh categories and emails after recategorization
        await fetchCategories()

      } else {
        throw new Error("Failed to recategorize emails")
      }
    } catch (error) {
      showErrorToast(error, "AI Recategorization")
    } finally {
      triggerEmailRefresh()
      setIsRecategorizing(false)
    }
  }

  const handleInitialCategoriesCreated = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleImportComplete = async () => {
    // Refresh categories and accounts after import
    await fetchCategories()
    await fetchAccounts()
    // Trigger email list refresh
    triggerEmailRefresh()
  }

  const getTotalEmailCount = () => {
    return categories.reduce((sum, cat) => sum + cat.email_count, 0)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Mail className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-sidebar-foreground">Email Sorter</h1>
              <p className="text-xs text-sidebar-foreground/70">AI-powered organization</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session?.user?.image || "/placeholder.svg"} alt={session?.user?.name || ""} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{session?.user?.name || "User"}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{session?.user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          />
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-sidebar-foreground">Categories</h3>
              <div className="flex items-center space-x-1">
                <Button
                  onClick={handleRecategorizeEmails}
                  disabled={isRecategorizing}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  title="AI Recategorize"
                >
                  {isRecategorizing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                </Button>
                <CreateCategoryDialog onCategoryCreated={() => setRefreshTrigger((prev) => prev + 1)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </CreateCategoryDialog>
              </div>
            </div>
            <div className="space-y-1">
              <Button
                variant={selectedCategory === "all" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-between text-left",
                  selectedCategory === "all"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
                onClick={() => handleCategorySelect("all")}
              >
                <div className="flex items-center">
                  <div className="mr-2 h-3 w-3 rounded-full bg-gray-400" />
                  All Emails
                </div>
                <Badge variant="secondary" className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                  {getTotalEmailCount()}
                </Badge>
              </Button>
              {categories.map((category) => (
                <div key={category.id} className="group relative">
                  <Button
                    variant={selectedCategory === category.id ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-between text-left pr-8",
                      selectedCategory === category.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <div className="flex items-center min-w-0">
                      <div
                        className="mr-2 h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                      {category.email_count}
                    </Badge>
                  </Button>
                  {category.name !== "Uncategorized" && (
                    <Button
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Connected Accounts */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-sidebar-foreground">Gmail Accounts</h3>
              <Badge variant="secondary" className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                {accounts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {accounts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-sidebar-foreground/70 mb-3">No accounts connected</p>
                </div>
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="group relative p-2 rounded-md bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                        <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                          {account.name?.charAt(0) || account.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <div className={cn("w-1.5 h-1.5 rounded-full", "bg-green-500")} />
                          <span className="text-xs text-sidebar-foreground truncate">{account.email}</span>
                          {account.is_primary && (
                            <Badge className="bg-sidebar-primary text-sidebar-primary-foreground text-xs px-1 py-0">
                              Primary
                            </Badge>
                          )}
                        </div>
                        {account.last_sync && (
                          <div className="flex items-center text-xs text-sidebar-foreground/50 mt-0.5">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {new Date(account.last_sync).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {!account.is_primary && (
                        <Button
                          onClick={() => handleRemoveAccount(account.id, account.email, account.is_primary)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Actions */}
          <div className="space-y-2">
            <MultiAccountDialog onAccountConnected={handleImportComplete} existingAccounts={accounts.length} />
            {accounts.length > 0 && <EmailImportButton accounts={accounts} onImportComplete={handleImportComplete} />}
          </div>
        </div>
      </ScrollArea>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Initial Categories Dialog */}
      <InitialCategoriesDialog
        isOpen={showInitialCategoriesDialog}
        onClose={() => setShowInitialCategoriesDialog(false)}
        onCategoriesCreated={handleInitialCategoriesCreated}
      />

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <Mail className="h-3 w-3 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Email Sorter</h1>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex h-screen lg:h-[calc(100vh-0px)]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 border-r border-sidebar-border bg-sidebar">{sidebarContent}</div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-80 bg-sidebar border-r border-sidebar-border">{sidebarContent}</div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 lg:p-6">
            <EmailList
              selectedCategory={selectedCategory}
              searchQuery={debouncedSearchQuery}
              accounts={accounts}
              categories={categories}
              onEmailsChange={triggerEmailRefresh}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
