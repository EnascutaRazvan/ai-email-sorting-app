"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, User } from "lucide-react"

interface Account {
  id: string
  email: string
  name?: string
  picture?: string
  is_primary: boolean
}

interface MultiAccountDialogProps {
  accounts: Account[]
  isOpen: boolean
  onClose: () => void
  onAccountSelect: (accountId: string) => void
  onConnectNew: () => void
}

export function MultiAccountDialog({
  accounts,
  isOpen,
  onClose,
  onAccountSelect,
  onConnectNew,
}: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectNew = async () => {
    setIsConnecting(true)
    try {
      await onConnectNew()
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Gmail Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => onAccountSelect(account.id)}
                className="w-full flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account.picture || "/placeholder.svg"} alt={account.name || account.email} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {account.name ? (
                      account.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{account.email}</p>
                    {account.is_primary && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                        Primary
                      </Badge>
                    )}
                  </div>
                  {account.name && <p className="text-xs text-gray-600">{account.name}</p>}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t pt-4">
            <Button
              onClick={handleConnectNew}
              disabled={isConnecting}
              variant="outline"
              className="w-full bg-transparent"
            >
              {isConnecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Connect Another Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
