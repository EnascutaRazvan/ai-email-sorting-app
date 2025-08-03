"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Categories } from "./categories"
import { ConnectedAccounts } from "./connected-accounts"
import { EmailList } from "./email-list"
import { EmailFilters } from "./email-filters"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InitialCategoriesDialog } from "./initial-categories-dialog"

interface Category {
  id: string
  name: string
  color: string
  email_count: number
}

export function DashboardLayout() {
  const { data: session } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "sender" | "subject">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [categories, setCategories] = useState<Category[]>([])
  const [showInitialDialog, setShowInitialDialog] = useState(false)
  const [hasCheckedCategories, setHasCheckedCategories] = useState(false)

  // Check if user has categories on mount
  useEffect(() => {
    const checkCategories = async () => {
      if (!session?.user?.id || hasCheckedCategories) return

      try {
        const response = await fetch("/api/categories")
        if (response.ok) {
          const data = await response.json()
          const userCategories = data.categories || []

          // Filter out "Uncategorized" category for the check
          const nonUncategorizedCategories = userCategories.filter(
            (cat: Category) => cat.name.toLowerCase() !== "uncategorized",
          )

          setCategories(userCategories)

          // Show dialog only if user has no categories (excluding Uncategorized)
          if (nonUncategorizedCategories.length === 0) {
            setShowInitialDialog(true)
          }
        }
      } catch (error) {
        console.error("Error checking categories:", error)
      } finally {
        setHasCheckedCategories(true)
      }
    }

    checkCategories()
  }, [session?.user?.id, hasCheckedCategories])

  const handleCategoriesCreated = async () => {
    // Refresh categories after creation
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error refreshing categories:", error)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarContent className="flex flex-col h-full">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Email Sorter</h2>
                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                          <AvatarFallback>{getUserInitials(session?.user?.name)}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          {session?.user?.name && <p className="font-medium">{session.user.name}</p>}
                          {session?.user?.email && (
                            <p className="w-[200px] truncate text-sm text-muted-foreground">{session.user.email}</p>
                          )}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <Categories selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />
            </div>

            <div className="border-t">
              <ConnectedAccounts />
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger />
                <h1 className="text-2xl font-bold">Dashboard</h1>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b p-4">
              <EmailFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
              />
            </div>

            <div className="flex-1 overflow-hidden">
              <EmailList
                key={`${selectedCategory}-${searchQuery}-${sortBy}-${sortOrder}`}
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
            </div>
          </div>
        </div>
      </div>

      <InitialCategoriesDialog
        isOpen={showInitialDialog}
        onClose={() => setShowInitialDialog(false)}
        onCategoriesCreated={handleCategoriesCreated}
      />
    </SidebarProvider>
  )
}
