import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ConnectedAccounts } from "@/components/dashboard/connected-accounts"
import { EmailList } from "@/components/dashboard/email-list"
import { Categories } from "@/components/dashboard/categories"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Dashboard</h1>
          <p className="text-muted-foreground">Manage your emails across multiple Gmail accounts</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <ConnectedAccounts />
            <Categories selectedCategory={null} onCategorySelect={() => {}} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <EmailList selectedCategory={null} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
