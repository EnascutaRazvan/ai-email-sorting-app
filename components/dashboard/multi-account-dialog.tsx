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
import { Plus, Mail, Shield, Zap, CheckCircle, ExternalLink } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"

interface MultiAccountDialogProps {
  onAccountConnected: () => void
  existingAccounts: number
}

export function MultiAccountDialog({ onAccountConnected, existingAccounts }: MultiAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      // Create popup window for OAuth
      const popup = window.open(
        "/api/auth/connect-account",
        "connect-gmail",
        "width=500,height=600,scrollbars=yes,resizable=yes",
      )

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.")
      }

      // Listen for popup messages
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "ACCOUNT_CONNECTED") {
          popup.close()
          setIsOpen(false)
          onAccountConnected()
          window.removeEventListener("message", handleMessage)
        } else if (event.data?.type === "ACCOUNT_ERROR") {
          popup.close()
          showErrorToast(event.data.error || "Failed to connect account", "Account Connection")
          window.removeEventListener("message", handleMessage)
        }
      }

      window.addEventListener("message", handleMessage)

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          window.removeEventListener("message", handleMessage)
          setIsConnecting(false)
        }
      }, 1000)
    } catch (error) {
      showErrorToast(error, "Connect Account")
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Connect Gmail Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            Connect Gmail Account
          </DialogTitle>
          <DialogDescription>
            Connect your Gmail account to start organizing emails with AI-powered categorization and smart features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          {existingAccounts > 0 && (
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100">
                  {existingAccounts} Account{existingAccounts > 1 ? "s" : ""} Connected
                </h4>
              </div>
              <p className="text-xs text-green-800 dark:text-green-200">
                You can connect multiple Gmail accounts to manage all your emails in one place.
              </p>
            </div>
          )}

          {/* Features */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">What you get:</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Zap className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                <span>Automatic email import every 15 minutes</span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                <span>Secure OAuth 2.0 - your credentials are never stored</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-purple-600 mr-2 flex-shrink-0" />
                <span>AI-powered categorization and summarization</span>
              </div>
              <div className="flex items-center">
                <Mail className="h-4 w-4 text-orange-600 mr-2 flex-shrink-0" />
                <span>Smart unsubscribe from unwanted emails</span>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Your privacy is protected:</p>
                <ul className="space-y-1">
                  <li>• We only read email metadata and content for processing</li>
                  <li>• Your emails are processed securely and never shared</li>
                  <li>• You can revoke access anytime from your Google account</li>
                  <li>• All data is encrypted and stored securely</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleConnectAccount}
            disabled={isConnecting}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isConnecting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
          <p className="text-xs text-muted-foreground text-center">
            A popup window will open to authenticate with Google. Please allow popups for this site.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
