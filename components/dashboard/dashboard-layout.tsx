"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mail, LogOut, Plus, Folder, Inbox, Star, Menu, X } from "lucide-react"
import { EmailList } from "./email-list"
import { Categories } from "./categories"
import { ConnectedAccounts } from "./connected-accounts"
import { EmailImportButton } from "./email-import-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children?: React.ReactNode
}

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
  is_connected: boolean
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string | null>("all")
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (session?.user?.id) {
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error)
    }
  }

  const fetchAccounts = async () => {
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
  }

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setSidebarOpen(false) // Close sidebar on mobile after selection
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Email Sorter</h1>
              <p className="text-xs text-muted-foreground">AI-powered organization</p>
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
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={session?.user?.image || "/placeholder.svg"} alt={session?.user?.name || ""} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{session?.user?.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Quick Filters */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground mb-3">Quick Filters</h3>
            <div className="space-y-1">
              <Button
                variant={selectedCategory === "all" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start text-left",
                  selectedCategory === "all"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                onClick={() => handleCategorySelect("all")}
              >
                <Inbox className="mr-2 h-4 w-4" />
                All Emails
              </Button>
              <Button
                variant={selectedCategory === "unread" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start text-left",
                  selectedCategory === "unread"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                onClick={() => handleCategorySelect("unread")}
              >
                <Mail className="mr-2 h-4 w-4" />
                Unread
              </Button>
              <Button
                variant={selectedCategory === "starred" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start text-left",
                  selectedCategory === "starred"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                onClick={() => handleCategorySelect("starred")}
              >
                <Star className="mr-2 h-4 w-4" />
                Starred
              </Button>
            </div>
          </div>

          <Separator />

          {/* Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Categories</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              <Button
                variant={selectedCategory === "uncategorized" ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start text-left",
                  selectedCategory === "uncategorized"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                onClick={() => handleCategorySelect("uncategorized")}
              >
                <Folder className="mr-2 h-4 w-4" />
                Uncategorized
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-between text-left",
                    selectedCategory === category.id
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <div className="flex items-center">
                    <div className="mr-2 h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate">{category.name}</span>
                  </div>
                  {category.email_count > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground text-xs">
                      {category.email_count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Connected Accounts */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Connected Accounts</h3>
            <div className="space-y-1">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className={cn("w-2 h-2 rounded-full", account.is_connected ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-xs text-muted-foreground truncate">{account.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <EmailImportButton
              accounts={accounts}
              onImportComplete={() => {
                fetchCategories()
                fetchAccounts()
              }}
            />
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
        <div className="hidden lg:block w-80 border-r border-border bg-card">{sidebarContent}</div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-80 bg-card border-r border-border">{sidebarContent}</div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 lg:p-6 space-y-6">
            {children || (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
                {/* Email List - Takes up most space */}
                <div className="xl:col-span-3 h-full">
                  <EmailList
                    selectedCategory={selectedCategory}
                    accounts={accounts}
                    categories={categories}
                    onEmailsChange={() => {
                      fetchCategories()
                      fetchAccounts()
                    }}
                  />
                </div>

                {/* Right Sidebar - Categories and Accounts */}
                <div className="xl:col-span-1 space-y-6">
                  <Categories
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    onCategoriesChange={fetchCategories}
                  />
                  <ConnectedAccounts />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
