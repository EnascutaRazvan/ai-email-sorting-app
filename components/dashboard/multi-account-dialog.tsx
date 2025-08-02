"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, Shield, CheckCircle, ExternalLink } from "lucide-react"

interface MultiAccountDialogProps {
  onAccountConnected: () => void
  existingAccounts: number
}

export function MultiAccountDialog({ onAccountConnected, existingAccounts }: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectAccount = () => {
    setIsConnecting(true)

    // Create popup window for OAuth
    const popup = window.open(
      "/api/auth/connect-account",
      "connect-account",
      "width=500,height=600,scrollbars=yes,resizable=yes",
    )

    // Listen for popup messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ACCOUNT_CONNECTED") {
        popup?.close()
        onAccountConnected()
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
      } else if (event.data?.type === "ACCOUNT_ERROR") {
        popup?.close()
        setIsConnecting(false)
        window.removeEventListener("message", handleMessage)
      }
    }

    window.addEventListener("message", handleMessage)

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        setIsConnecting(false)
        clearInterval(checkClosed)
        window.removeEventListener("message", handleMessage)
      }
    }, 1000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          Connect Gmail Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg text-gray-900">
            <Mail className="mr-2 h-5 w-5 text-blue-600" />
            Connect Gmail Account
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Connect additional Gmail accounts to manage all your emails in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-blue-900">Connected Accounts</h4>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {existingAccounts}
              </Badge>
            </div>
            <p className="text-xs text-blue-800">
              {existingAccounts === 0
                ? "No accounts connected yet. Connect your first Gmail account to get started."
                : `You have ${existingAccounts} account${existingAccounts === 1 ? "" : "s"} connected. Add more to centralize your email management.`}
            </p>
          </div>

          {/* Security Information */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Shield className="h-4 w-4 text-green-600 mr-2" />
              <h4 className="text-sm font-medium text-green-900">Secure Connection</h4>
            </div>
            <div className="space-y-1 text-xs text-green-800">
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span>Google OAuth 2.0 authentication</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span>Read-only access to your emails</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span>No passwords stored</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                <span>Revoke access anytime</span>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect with Google
              </>
            )}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-gray-600 text-center">
            You'll be redirected to Google to authorize access to your Gmail account. This allows us to import and
            organize your emails with AI.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
