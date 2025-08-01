"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { EmailList } from "@/components/dashboard/email-list"
import { Categories } from "@/components/dashboard/categories"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    redirect("/auth/signin")
  }

  const SidebarContent = () => (
    <div className="space-y-6 p-6 h-full bg-gradient-to-b from-gray-50 to-white">
      <ConnectedAccounts />
      <Categories selectedCategory={selectedCategory} onCategorySelect={setSelectedCategory} />
    </div>
  )

  return (
    <DashboardLayout>
      <div className="flex h-full bg-gradient-to-br from-gray-50 to-blue-50/30">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-80 border-r border-gray-200/50 bg-white/50 backdrop-blur-sm">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <h1 className="text-lg font-semibold text-gray-900">Email Dashboard</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>

          {/* Email List */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto">
            <EmailList selectedCategory={selectedCategory} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
