"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, CheckCircle } from "lucide-react"

interface ConnectedAccount {
  id: string
  email: string
  is_primary: boolean
  created_at: string
}

export function ConnectedAccounts() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchConnectedAccounts()
  }, [session])

  const fetchConnectedAccounts = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts)
      }
    } catch (error) {
      console.error("Error fetching accounts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectNewAccount = async () => {
    // This will trigger the OAuth flow for additional accounts
    window.location.href = "/api/auth/signin/google"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          Connected Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">{account.email}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Connected {new Date(account.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {account.is_primary && (
              <Badge variant="secondary" className="text-xs">
                Primary
              </Badge>
            )}
          </div>
        ))}

        <Button onClick={handleConnectNewAccount} variant="outline" className="w-full bg-transparent" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Connect New Account
        </Button>
      </CardContent>
    </Card>
  )
}
