"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Sparkles, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MultiAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MultiAccountDialog({ open, onOpenChange }: MultiAccountDialogProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const { toast } = useToast()

  const handleConnectAccount = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch("/api/auth/connect-account", {
        method: "POST", // Changed to POST
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch (error: any) {
      console.error("Error connecting account:", error)
      toast({
        title: "Connection Failed",
        description: error.message || "Could not initiate Google account connection.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold">Connect Another Account</DialogTitle>
          <DialogDescription>Add more Gmail accounts to manage all your emails in one place.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center mb-2 text-gray-600 dark:text-gray-400">
            <Sparkles className="h-4 w-4 mr-1" />
            <span>Powered by AI</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              <span>View emails from all connected accounts in one inbox.</span>
            </li>
            <li className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              <span>Categorize and manage emails across accounts seamlessly.</span>
            </li>
            <li className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              <span>Disconnect accounts anytime to hide their emails.</span>
            </li>
          </ul>
          <Button onClick={handleConnectAccount} disabled={isConnecting} className="w-full" size="lg">
            {isConnecting ? (
              <div className="flex items-center">
                <Loader2 className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connect with Google
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
