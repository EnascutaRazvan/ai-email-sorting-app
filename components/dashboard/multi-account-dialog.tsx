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
import { signIn } from "next-auth/react"
import { ChromeIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MultiAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onAccountConnected: () => void
}

export function MultiAccountDialog({ isOpen, onClose, onAccountConnected }: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleConnectGoogle = async () => {
    setIsConnecting(true)
    try {
      // Redirect to Google for authentication. The callback will handle saving the account.
      await signIn("google", {
        callbackUrl: `${window.location.origin}/api/auth/connect-callback`,
      })
      // The onAccountConnected will be called by the callback route after successful connection
    } catch (error) {
      console.error("Error initiating Google sign-in for new account:", error)
      toast({
        title: "Connection Failed",
        description: "Could not initiate Google account connection. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect New Email Account</DialogTitle>
          <DialogDescription>
            Connect an additional email account to manage all your emails in one place.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleConnectGoogle}
            disabled={isConnecting}
          >
            <ChromeIcon className="mr-2 h-5 w-5" />
            {isConnecting ? "Connecting..." : "Connect with Google"}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConnecting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
