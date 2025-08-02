"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { CategoriesDropdown } from "@/components/dashboard/categories-dropdown"
import { EmailFilters } from "@/components/dashboard/email-filters"
import { EmailList } from "@/components/dashboard/email-list"
import { UserSettingsDialog } from "@/components/dashboard/user-settings-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [readFilter, setReadFilter] = useState("all")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    redirect("/auth/signin")
  }

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/emails/sync-all", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to sync emails")

      toast.success("Email sync started successfully!")
      handleRefresh()
    } catch (error) {
      console.error("Error syncing emails:", error)
      toast.error("Failed to sync emails")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Dashboard</h1>
            <p className="text-gray-600 mt-1">Organize and manage your emails with AI-powered categorization</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSyncAll} disabled={isSyncing}>
              {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {isSyncing ? "Syncing..." : "Sync All"}
            </Button>

            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="emails" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="emails" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Filters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CategoriesDropdown
                      onCategorySelect={setSelectedCategoryId}
                      selectedCategoryId={selectedCategoryId}
                    />

                    <EmailFilters
                      onAccountSelect={setSelectedAccountId}
                      onSearchChange={setSearchQuery}
                      onReadFilterChange={setReadFilter}
                      selectedAccountId={selectedAccountId}
                      searchQuery={searchQuery}
                      readFilter={readFilter}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Email List */}
              <div className="lg:col-span-3">
                <EmailList
                  categoryId={selectedCategoryId}
                  accountId={selectedAccountId}
                  searchQuery={searchQuery}
                  readFilter={readFilter}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <ConnectedAccounts onAccountChange={handleRefresh} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Settings Dialog */}
      <UserSettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </DashboardLayout>
  )
}
