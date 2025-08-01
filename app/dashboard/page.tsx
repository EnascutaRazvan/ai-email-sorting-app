"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { EmailList } from "@/components/dashboard/email-list"
import { Categories } from "@/components/dashboard/categories"

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-6 shadow-elevation-1">
          <h1 className="text-2xl font-bold text-foreground mb-2">Email Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your emails with AI-powered categorization and smart organization
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Accounts & Categories */}
          <div className="space-y-6">
            <ConnectedAccounts />
            <Categories onCategorySelect={setSelectedCategory} selectedCategory={selectedCategory} />
          </div>

          {/* Right Column - Email List */}
          <div className="lg:col-span-2">
            <EmailList selectedCategory={selectedCategory} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
