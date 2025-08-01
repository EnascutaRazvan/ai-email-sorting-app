import { EmailImportButton } from "@/components/dashboard/email-import-button"
import ConnectedAccounts from "@/components/dashboard/connected-accounts"

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="space-y-6">
        <ConnectedAccounts />
        <EmailImportButton onImportComplete={() => window.location.reload()} />
      </div>
    </div>
  )
}
