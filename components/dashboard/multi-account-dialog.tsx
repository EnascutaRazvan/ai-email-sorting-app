"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, Mail, Plus, RefreshCw } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface MultiAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onAccountsChange: () => void
}

interface PendingAccount {
  email: string
  name?: string
  selected: boolean
}

export function MultiAccountDialog({ isOpen, onClose, onAccountsChange }: MultiAccountDialogProps) {
  const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([])
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectSelected = async () => {
    const selectedAccounts = pendingAccounts.filter((account) => account.selected)

    if (selectedAccounts.length === 0) {
      showErrorToast(new Error("Please select at least one account to connect"), "Account Selection")
      return
    }

    setIsConnecting(true)
    try {
      // This would typically make API calls to connect the selected accounts
      // For now, we'll simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      showSuccessToast("Accounts Connected", `Successfully connected ${selectedAccounts.length} account(s)`)

      onAccountsChange()
      onClose()
    } catch (error) {
      showErrorToast(error, "Connecting Accounts")
    } finally {
      setIsConnecting(false)
    }
  }

  const toggleAccountSelection = (email: string) => {
    setPendingAccounts((prev) =>
      prev.map((account) => (account.email === email ? { ...account, selected: !account.selected } : account)),
    )
  }

  const getAccountInitials = (email: string, name?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-blue-600" />
            Connect Multiple Accounts
          </DialogTitle>
          <DialogDescription>Select the Gmail accounts you want to connect for email organization.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {pendingAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">No accounts available to connect</p>
            </div>
          ) : (
            pendingAccounts.map((account) => (
              <div
                key={account.email}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  account.selected ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
                onClick={() => toggleAccountSelection(account.email)}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg" alt={account.name || account.email} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs">
                      {getAccountInitials(account.email, account.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{account.name || account.email}</p>
                    {account.name && <p className="text-xs text-gray-600 truncate">{account.email}</p>}
                  </div>
                </div>

                {account.selected && <CheckCircle className="h-5 w-5 text-blue-600" />}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {pendingAccounts.filter((a) => a.selected).length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {pendingAccounts.filter((a) => a.selected).length} selected
              </Badge>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectSelected}
              disabled={isConnecting || pendingAccounts.filter((a) => a.selected).length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Connect Selected
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
