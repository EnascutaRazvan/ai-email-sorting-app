"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChromeIcon, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { showErrorToast } from "@/lib/error-handler"

interface MultiAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onAccountConnected: () => void
}

export function MultiAccountDialog({ isOpen, onClose, onAccountConnected }: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnectGoogle = async () => {
    setIsConnecting(true)
    try {
      // Redirect to your custom connect-account API route
      // This route will handle the Google OAuth flow and then redirect back
      // to /dashboard?status=account_connected or /dashboard?error=...
      await signIn("google", {
        callbackUrl: `${window.location.origin}/api/auth/connect-callback`,
        redirect: false, // Prevent NextAuth.js from redirecting directly
      })

      // After the signIn call, the browser will be redirected by the Google OAuth flow
      // and then by your /api/auth/connect-callback route.
      // We don't need to do anything more here, as the page will reload.
      // The onAccountConnected will be triggered by the dashboard page's useEffect
      // listening for account changes or a refresh event.
    } catch (error) {
      showErrorToast(error, "Connect Google Account")
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>Connect New Account</DialogTitle>
          <DialogDescription>Connect an additional Gmail account to manage its emails.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleConnectGoogle}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Connecting...
              </>
            ) : (
              <>
                <ChromeIcon className="mr-2 h-5 w-5" />
                Connect with Google
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
