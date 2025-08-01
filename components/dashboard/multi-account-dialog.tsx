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
import { Plus, Mail, Shield, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react"
import { showErrorToast } from "@/lib/error-handler"

interface MultiAccountDialogProps {
  onAccountConnected: () => void
  existingAccounts: number
}

export function MultiAccountDialog({ onAccountConnected, existingAccounts }: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/auth/connect-account")
      if (response.ok) {
        const data = await response.json()

        // Open in popup window for better UX
        const popup = window.open(data.authUrl, "gmail-connect", "width=500,height=600,scrollbars=yes,resizable=yes")

        // Listen for popup close
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            setIsConnecting(false)
            setIsOpen(false)
            onAccountConnected()
          }
        }, 1000)

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed)
          if (popup && !popup.closed) {
            popup.close()
          }
          setIsConnecting(false)
        }, 300000)
      } else {
        throw new Error("Failed to generate auth URL")
      }
    } catch (error) {
      showErrorToast(error, "Connecting New Account")
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-sm"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Connect Gmail Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg text-foreground">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            Connect Gmail Account
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add another Gmail account to manage multiple inboxes in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Current Status</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You have{" "}
              <Badge variant="secondary" className="mx-1">
                {existingAccounts}
              </Badge>
              Gmail account{existingAccounts !== 1 ? "s" : ""} connected
            </p>
          </div>

          {/* Security Info */}
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-sm text-green-800 dark:text-green-200">
              <strong>Secure Connection:</strong> We use Google's OAuth 2.0 for secure authentication. Your passwords
              are never stored or accessed.
            </AlertDescription>
          </Alert>

          {/* Instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">What happens next:</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground">Google will open in a new window</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground">Choose the Gmail account you want to connect</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground">Grant permissions to read and manage emails</p>
              </div>
            </div>
          </div>

          {/* Development Warning */}
          {process.env.NODE_ENV === "development" && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Development Mode:</strong> If you see "Access blocked", you need to add your email as a test
                user in Google Cloud Console.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleConnectAccount}
              disabled={isConnecting}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
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
