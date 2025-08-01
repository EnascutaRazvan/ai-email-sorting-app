"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { EmailList } from "@/components/dashboard/email-list"
import { Categories } from "@/components/dashboard/categories"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
          <ConnectedAccounts />
          <Categories selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <EmailList selectedCategory={selectedCategory} />
        </div>
      </div>
    </DashboardLayout>
  )
}
