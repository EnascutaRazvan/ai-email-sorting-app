"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Info, ExternalLink, AlertTriangle } from "lucide-react"

interface MultiAccountGuideProps {
  onProceed: () => void
  isLoading: boolean
}

export function MultiAccountGuide({ onProceed, isLoading }: MultiAccountGuideProps) {
  const [showGuide, setShowGuide] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowGuide(true)}
        variant="outline"
        className="w-full bg-transparent"
        size="sm"
        disabled={isLoading}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        {isLoading ? "Connecting..." : "Connect New Account"}
      </Button>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              Connect Additional Gmail Account
            </DialogTitle>
            <DialogDescription>Follow these steps to connect a different Gmail account</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Development Mode:</strong> This app is in development and not yet verified by Google.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  1
                </Badge>
                <div>
                  <p className="font-medium">Sign out of Google (if needed)</p>
                  <p className="text-sm text-gray-600">
                    If you want to connect a different account, sign out of Google in another tab first.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  2
                </Badge>
                <div>
                  <p className="font-medium">Click "Advanced" on the warning screen</p>
                  <p className="text-sm text-gray-600">
                    Google will show a warning. Click "Advanced" then "Go to [app name] (unsafe)".
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  3
                </Badge>
                <div>
                  <p className="font-medium">Grant permissions</p>
                  <p className="text-sm text-gray-600">Allow access to Gmail reading and modification permissions.</p>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> In production, this app will be verified by Google and this process will be much
                simpler.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowGuide(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowGuide(false)
                onProceed()
              }}
              disabled={isLoading}
            >
              I Understand, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
