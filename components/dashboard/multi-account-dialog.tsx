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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, Shield, RefreshCw, CheckCircle, AlertTriangle, Info, Users } from "lucide-react"
import { showErrorToast, showSuccessToast } from "@/lib/error-handler"

interface MultiAccountDialogProps {
  onAccountConnected: () => void
  existingAccounts: number
}

export function MultiAccountDialog({ onAccountConnected, existingAccounts }: MultiAccountDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStep, setConnectionStep] = useState<"idle" | "authorizing" | "processing">("idle")

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    setConnectionStep("authorizing")

    try {
      const response = await fetch("/api/auth/connect-account")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate authorization URL")
      }

      const data = await response.json()

      // Open OAuth in popup window for better UX
      const popup = window.open(
        data.authUrl,
        "gmail-oauth",
        "width=500,height=700,scrollbars=yes,resizable=yes,left=" +
          (window.screen.width / 2 - 250) +
          ",top=" +
          (window.screen.height / 2 - 350),
      )

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups and try again.")
      }

      setConnectionStep("processing")

      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          setConnectionStep("idle")
          setIsConnecting(false)

          // Check if connection was successful by refreshing accounts
          setTimeout(() => {
            onAccountConnected()
            setIsOpen(false)
          }, 1000)
        }
      }, 1000)

      // Listen for messages from popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "ACCOUNT_CONNECTED") {
          clearInterval(checkClosed)
          popup.close()
          setConnectionStep("idle")
          setIsConnecting(false)
          showSuccessToast("Account Connected", `${event.data.email} has been successfully connected!`)
          onAccountConnected()
          setIsOpen(false)
        } else if (event.data?.type === "ACCOUNT_ALREADY_CONNECTED") {
          clearInterval(checkClosed)
          popup.close()
          setConnectionStep("idle")
          setIsConnecting(false)
          showSuccessToast("Account Refreshed", `${event.data.email} tokens have been updated.`)
          onAccountConnected()
          setIsOpen(false)
        } else if (event.data?.type === "ACCOUNT_CONNECTION_ERROR") {
          clearInterval(checkClosed)
          popup.close()
          setConnectionStep("idle")
          setIsConnecting(false)
          showErrorToast(event.data.description || "Connection failed", "Account Connection")
        }
      }

      window.addEventListener("message", handleMessage)

      // Cleanup after 10 minutes
      setTimeout(() => {
        clearInterval(checkClosed)
        window.removeEventListener("message", handleMessage)
        if (!popup.closed) {
          popup.close()
        }
        setConnectionStep("idle")
        setIsConnecting(false)
      }, 600000)
    } catch (error) {
      console.error("Connection error:", error)
      showErrorToast(error, "Account Connection")
      setConnectionStep("idle")
      setIsConnecting(false)
    }
  }

  const getStepContent = () => {
    switch (connectionStep) {
      case "authorizing":
        return {
          icon: <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />,
          title: "Opening Account Selector",
          description: "Please select a different Gmail account in the popup window...",
        }
      case "processing":
        return {
          icon: <RefreshCw className="h-5 w-5 animate-spin text-green-600" />,
          title: "Processing Connection",
          description: "Finalizing your account connection...",
        }
      default:
        return {
          icon: <Plus className="h-5 w-5" />,
          title: "Connect New Gmail Account",
          description: "Add another Gmail account to manage all your emails in one place",
        }
    }
  }

  const stepContent = getStepContent()

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-transparent" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Connect New Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {stepContent.icon}
            <span className="ml-2">{stepContent.title}</span>
          </DialogTitle>
          <DialogDescription>{stepContent.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Connected Accounts</span>
            </div>
            <Badge variant="secondary">{existingAccounts}</Badge>
          </div>

          {/* Multi-Account Instructions */}
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Multi-Account Setup:</strong> You'll see Google's account chooser. Select a DIFFERENT account than
              your current one, or click "Use another account" to sign in with a new Gmail account.
            </AlertDescription>
          </Alert>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Secure Connection:</strong> We use Google's OAuth 2.0 for secure authentication. Your credentials
              are never stored on our servers.
            </AlertDescription>
          </Alert>

          {/* OAuth Permissions Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Info className="mr-2 h-4 w-4" />
              Required Permissions
            </h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-3 w-3 text-green-600" />
                Read your Gmail messages
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-3 w-3 text-green-600" />
                Manage your Gmail messages (for unsubscribe)
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-3 w-3 text-green-600" />
                Access your basic profile information
              </div>
            </div>
          </div>

          {/* Step-by-step instructions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">What to expect:</h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-start space-x-2">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">1.</span>
                <span>Google account chooser will open</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">2.</span>
                <span>Select a different Gmail account</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">3.</span>
                <span>Grant permissions when prompted</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">4.</span>
                <span>Account will be added to your dashboard</span>
              </div>
            </div>
          </div>

          {/* Development Warning */}
          {process.env.NODE_ENV === "development" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Development Mode:</strong> If you see "Access blocked" error, make sure you've added your Gmail
                accounts as test users in Google Cloud Console.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button onClick={handleConnectAccount} disabled={isConnecting} className="flex-1">
              {isConnecting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {connectionStep === "authorizing" ? "Opening Chooser..." : "Processing..."}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Account
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isConnecting}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
