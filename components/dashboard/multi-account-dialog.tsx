"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Mail, Plus, RefreshCw, Shield, Zap, CheckCircle } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"

interface MultiAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onAccountConnected: () => void
  existingAccounts: number
}

export function MultiAccountDialog({ isOpen, onClose, onAccountConnected, existingAccounts }: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/auth/connect-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        const data = await response.json()
        // Open in popup window
        const popup = window.open(data.authUrl, "gmail-connect", "width=500,height=600,scrollbars=yes,resizable=yes")

        // Listen for popup completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            onAccountConnected()
            onClose()
          }
        }, 1000)
      } else {
        throw new Error("Failed to initiate account connection")
      }
    } catch (error) {
      showErrorToast(error, "Connecting Account")
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5 text-blue-600" />
            Connect Gmail Account
            {existingAccounts > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 text-xs">
                +{existingAccounts + 1}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {existingAccounts === 0
              ? "Connect your first Gmail account to start organizing your emails with AI."
              : `Connect an additional Gmail account to manage multiple inboxes in one place. You currently have ${existingAccounts} account${existingAccounts > 1 ? "s" : ""} connected.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Features */}
          <div className="bg-blue-50/50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">What you'll get:</h4>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center">
                <Mail className="h-3 w-3 text-blue-600 mr-2 flex-shrink-0" />
                <span>
                  {existingAccounts === 0
                    ? "Access to all your Gmail emails in one organized dashboard"
                    : "All emails from multiple accounts in one unified inbox"}
                </span>
              </div>
              <div className="flex items-center">
                <Zap className="h-3 w-3 text-purple-600 mr-2 flex-shrink-0" />
                <span>Automatic AI categorization and email summarization</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-3 w-3 text-green-600 mr-2 flex-shrink-0" />
                <span>Smart filtering, bulk actions, and unsubscribe management</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-3 w-3 text-orange-600 mr-2 flex-shrink-0" />
                <span>Secure OAuth 2.0 - your credentials are never stored</span>
              </div>
            </div>
          </div>

          {/* Multiple Account Benefits */}
          {existingAccounts > 0 && (
            <div className="bg-green-50/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Multiple Account Benefits:</h4>
              <div className="space-y-1 text-xs text-gray-700">
                <div>• See emails from all connected accounts in one place</div>
                <div>• Filter by specific account when needed</div>
                <div>• Unified AI categorization across all accounts</div>
                <div>• Remove accounts anytime to hide their emails</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Connect Gmail Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
