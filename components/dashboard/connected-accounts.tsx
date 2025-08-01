"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Mail, Trash2, RefreshCw } from "lucide-react"
import { EmailImportButton } from "./email-import-button"
import { toast } from "sonner"

interface Account {
  id: string
  email: string
  provider: string
  is_active: boolean
  created_at: string
  last_sync: string | null
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      const data = await response.json()

      if (data.success) {
        setAccounts(data.accounts)
      } else {
        toast.error("Failed to fetch accounts")
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
      toast.error("Failed to fetch accounts")
    } finally {
      setLoading(false)
    }
  }

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/auth/connect-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: "google" }),
      })

      const data = await response.json()

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl
      } else {
        toast.error("Failed to initiate account connection")
      }
    } catch (error) {
      console.error("Error connecting account:", error)
      toast.error("Failed to connect account")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Account disconnected successfully")
        fetchAccounts()
      } else {
        toast.error("Failed to disconnect account")
      }
    } catch (error) {
      console.error("Error disconnecting account:", error)
      toast.error("Failed to disconnect account")
    }
  }

  const handleImportComplete = () => {
    toast.success("Emails imported successfully!")
    fetchAccounts() // Refresh to update last sync time
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Loading your connected email accounts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connected Accounts
        </CardTitle>
        <CardDescription>Manage your connected email accounts and import emails with AI processing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No accounts connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your Gmail account to start importing and organizing emails
            </p>
            <Button onClick={handleConnectAccount} disabled={isConnecting}>
              <Plus className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Gmail Account"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">{account.email}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.provider.toUpperCase()}
                        </Badge>
                        {account.last_sync && (
                          <span>Last sync: {new Date(account.last_sync).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <EmailImportButton
                      accountId={account.id}
                      accountEmail={account.email}
                      onImportComplete={handleImportComplete}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleDisconnectAccount(account.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {accounts.length} account{accounts.length !== 1 ? "s" : ""} connected
              </p>
              <Button variant="outline" onClick={handleConnectAccount} disabled={isConnecting}>
                <Plus className="h-4 w-4 mr-2" />
                {isConnecting ? "Connecting..." : "Add Another Account"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
