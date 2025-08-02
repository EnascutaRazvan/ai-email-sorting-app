"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { Categories } from "@/components/dashboard/categories"
import { EmailList } from "@/components/dashboard/email-list"
import { useToast } from "@/components/ui/use-toast"

interface Account {
  id: string
  email: string
  name?: string
}

interface Category {
  id: string
  name: string
  color: string
  count?: number // Add count for categories
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [refreshKey, setRefreshKey] = useState(0) // Key to force re-render/re-fetch in children
  const { toast } = useToast()

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin")
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccounts()
      fetchCategories()
      ensureDefaultCategories()
    }
  }, [session])

  useEffect(() => {
    // Listen for account removal events
    const handleAccountRemoved = (event: CustomEvent) => {
      const { accountId } = event.detail
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId))
      // Trigger email list refresh and category refresh
      setRefreshKey((prev) => prev + 1)
      fetchCategories() // Re-fetch categories to update counts
    }

    window.addEventListener("accountRemoved", handleAccountRemoved as EventListener)
    return () => {
      window.removeEventListener("accountRemoved", handleAccountRemoved as EventListener)
    }
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load connected accounts.",
        variant: "destructive",
      })
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories.",
        variant: "destructive",
      })
    }
  }

  const ensureDefaultCategories = async () => {
    try {
      const response = await fetch("/api/categories/ensure-uncategorized", {
        method: "POST",
      })
      if (!response.ok) {
        console.error("Failed to ensure default categories.")
      }
    } catch (error) {
      console.error("Error ensuring default categories:", error)
    }
  }

  const handleCategoriesChange = useCallback(() => {
    fetchCategories()
    setRefreshKey((prev) => prev + 1) // Trigger email list refresh
  }, [])

  const handleEmailsChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1) // Trigger email list refresh
    fetchCategories() // Refresh category counts
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Left Sidebar - Accounts and Categories */}
        <div className="lg:col-span-1 space-y-6">
          <ConnectedAccounts onAccountsChange={fetchAccounts} />
          <Categories
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            onCategoriesChange={handleCategoriesChange}
            categories={categories} // Pass categories to Categories component
          />
        </div>

        {/* Main Content - Email List */}
        <div className="lg:col-span-3">
          <EmailList
            key={refreshKey} // Use key to force re-mount/re-fetch when refreshKey changes
            selectedCategory={selectedCategory}
            accounts={accounts}
            categories={categories}
            onEmailDeleted={handleEmailsChange}
            onEmailCategorized={handleEmailsChange}
            onEmailsRecategorized={handleEmailsChange}
            onEmailsUnsubscribed={handleEmailsChange}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
