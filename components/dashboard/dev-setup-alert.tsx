"use client"

import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Settings, ExternalLink } from "lucide-react"

export function DevSetupAlert() {
  const [showSetup, setShowSetup] = useState(false)

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (
    <>
      <Alert className="mb-4">
        <Settings className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>App in development mode - OAuth setup required for multi-account</span>
          <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
            Setup Guide
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Google OAuth Setup for Development</DialogTitle>
            <DialogDescription>Configure your Google Cloud Console for multi-account support</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  1
                </Badge>
                <div>
                  <p className="font-medium">Go to Google Cloud Console</p>
                  <p className="text-sm text-gray-600 mb-2">Visit the Google Cloud Console and select your project</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://console.cloud.google.com/", "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Console
                  </Button>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  2
                </Badge>
                <div>
                  <p className="font-medium">Configure OAuth Consent Screen</p>
                  <p className="text-sm text-gray-600">Go to "APIs & Services" → "OAuth consent screen"</p>
                  <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                    <li>Choose "External" user type</li>
                    <li>Fill in app name and developer contact</li>
                    <li>Add your domain to authorized domains</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  3
                </Badge>
                <div>
                  <p className="font-medium">Add Test Users</p>
                  <p className="text-sm text-gray-600">In OAuth consent screen, add test users including:</p>
                  <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                    <li>webshookeng@gmail.com</li>
                    <li>Your own Gmail accounts for testing</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="mt-1">
                  4
                </Badge>
                <div>
                  <p className="font-medium">Update Redirect URIs</p>
                  <p className="text-sm text-gray-600">In "Credentials" → "OAuth 2.0 Client IDs", add:</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded mt-1 block">
                    {process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/connect-callback
                  </code>
                </div>
              </div>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>Alternative:</strong> For now, you can test with the same account by signing out of Google
                between connections, or use Chrome incognito mode.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
