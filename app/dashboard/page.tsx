"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { Categories } from "@/components/dashboard/categories"
import { EmailList } from "@/components/dashboard/email-list"
import { DefaultCategoriesModal } from "@/components/dashboard/default-categories-modal"

interface Account {
  id: string
  email: string
  name?: string
}

interface Category {
  id: string
  name: string
  color: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showDefaultCategoriesModal, setShowDefaultCategoriesModal] = useState(false)
  const [hasCheckedDefaultCategories, setHasCheckedDefaultCategories] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin")
    }
  }, [status])

  useEffect(() => {
    if (session?.user?.id) {
      fetchAccounts()
      fetchCategories()
    }
  }, [session])

  useEffect(() => {
    // Listen for account removal events
    const handleAccountRemoved = (event: CustomEvent) => {
      const { accountId } = event.detail
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountId))
      // Trigger email list refresh
      setRefreshKey((prev) => prev + 1)
    }

    window.addEventListener("accountRemoved", handleAccountRemoved as EventListener)
    return () => {
      window.removeEventListener("accountRemoved", handleAccountRemoved as EventListener)
    }
  }, [])

  useEffect(() => {
    if (session?.user?.id && categories.length === 0 && !hasCheckedDefaultCategories) {
      // Small delay to ensure categories have been fetched
      const timer = setTimeout(() => {
        if (categories.length === 0) {
          setShowDefaultCategoriesModal(true)
        }
        setHasCheckedDefaultCategories(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [session, categories, hasCheckedDefaultCategories])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
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
    }
  }

  const handleCategoriesChange = () => {
    fetchCategories()
    setRefreshKey((prev) => prev + 1)
  }

  const handleEmailsChange = () => {
    setRefreshKey((prev) => prev + 1)
    fetchCategories() // Refresh category counts
  }

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
          <ConnectedAccounts />
          <Categories
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            onCategoriesChange={handleCategoriesChange}
          />
        </div>

        {/* Main Content - Email List */}
        <div className="lg:col-span-3">
          <EmailList
            key={refreshKey}
            selectedCategory={selectedCategory}
            accounts={accounts}
            categories={categories}
            onEmailsChange={handleEmailsChange}
          />
        </div>
      </div>
      <DefaultCategoriesModal
        isOpen={showDefaultCategoriesModal}
        onClose={() => setShowDefaultCategoriesModal(false)}
        onCategoriesCreated={() => {
          fetchCategories()
          setRefreshKey((prev) => prev + 1)
        }}
      />
    </DashboardLayout>
  )
}
