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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, ExternalLink, Settings, CheckCircle, AlertTriangle } from "lucide-react"
import { showSuccessToast } from "@/lib/error-handler"

export function OAuthSetupGuide() {
  const [isOpen, setIsOpen] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showSuccessToast(`${label} copied to clipboard`, "Setup Guide")
  }

  const currentDomain = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          Setup Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Google Cloud Console Setup Guide
          </DialogTitle>
          <DialogDescription>Follow these steps to configure Google OAuth for multi-account support</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="console" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="console">Console Setup</TabsTrigger>
            <TabsTrigger value="oauth">OAuth Config</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="console" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  <strong>Step 1:</strong> Go to{" "}
                  <a
                    href="https://console.cloud.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Enable Required APIs:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <span>Gmail API</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open("https://console.cloud.google.com/apis/library/gmail.googleapis.com", "_blank")
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Enable
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <span>Google+ API</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open("https://console.cloud.google.com/apis/library/plus.googleapis.com", "_blank")
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Enable
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="oauth" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Step 2:</strong> Configure OAuth Consent Screen
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">OAuth Consent Screen Settings:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <span>User Type: External</span>
                    <Badge variant="secondary">Required</Badge>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <div className="font-medium mb-1">Required Scopes:</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <code>https://www.googleapis.com/auth/gmail.readonly</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("https://www.googleapis.com/auth/gmail.readonly", "Gmail readonly scope")
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code>https://www.googleapis.com/auth/gmail.modify</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("https://www.googleapis.com/auth/gmail.modify", "Gmail modify scope")
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code>https://www.googleapis.com/auth/userinfo.email</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("https://www.googleapis.com/auth/userinfo.email", "Email scope")
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code>https://www.googleapis.com/auth/userinfo.profile</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard("https://www.googleapis.com/auth/userinfo.profile", "Profile scope")
                          }
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <h4 className="font-medium">Authorized Redirect URIs:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <code className="text-xs">{currentDomain}/api/auth/callback/google</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(`${currentDomain}/api/auth/callback/google`, "NextAuth callback URI")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <code className="text-xs">{currentDomain}/api/auth/connect-callback</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(`${currentDomain}/api/auth/connect-callback`, "Multi-account callback URI")
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Step 3:</strong> Add Test Users for Development
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium">Add Test Users:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <code>webshookeng@gmail.com</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard("webshookeng@gmail.com", "Test user email")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <div className="text-xs text-blue-800 dark:text-blue-200">
                      💡 <strong>Tip:</strong> Add all Gmail accounts you want to test with as test users. This bypasses
                      the "unverified app" warning.
                    </div>
                  </div>
                </div>

                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Important:</strong> For production, you'll need to submit your app for Google verification
                    to remove the test user limitation.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Testing Multi-Account Flow:</h4>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">1.</span>
                    <span>Sign in with your primary account</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">2.</span>
                    <span>Click "Connect New Account" - this will force account selection</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">3.</span>
                    <span>Choose a different Gmail account from the list</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">4.</span>
                    <span>Grant permissions and verify the account is added</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Console
          </Button>
          <Button onClick={() => setIsOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
