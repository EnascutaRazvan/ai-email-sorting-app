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
import { Copy, ExternalLink, Settings, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { showSuccessToast } from "@/lib/error-handler"

export function OAuthSetupGuide() {
  const [isOpen, setIsOpen] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showSuccessToast(`${label} copied to clipboard`, "Setup Helper")
  }

  const currentDomain = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs bg-transparent">
          <Settings className="mr-1 h-3 w-3" />
          Setup Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Google OAuth Setup Guide
          </DialogTitle>
          <DialogDescription>
            Configure your Google Cloud Console to enable multi-account Gmail integration
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="console" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="console">Console Setup</TabsTrigger>
            <TabsTrigger value="oauth">OAuth Config</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="console" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Step 1:</strong> Go to{" "}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center"
                >
                  Google Cloud Console
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">1. Enable Gmail API</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Go to "APIs & Services" → "Library" → Search for "Gmail API" → Enable it
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open("https://console.cloud.google.com/apis/library/gmail.googleapis.com", "_blank")
                  }
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Gmail API
                </Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">2. Configure OAuth Consent Screen</h4>
                <p className="text-sm text-gray-600 mb-2">Go to "APIs & Services" → "OAuth consent screen"</p>
                <ul className="text-xs space-y-1 text-gray-600 mb-2">
                  <li>• Choose "External" user type</li>
                  <li>• Fill in App name: "Email Sorting App"</li>
                  <li>• Add your email as developer contact</li>
                  <li>• Add authorized domains if using custom domain</li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://console.cloud.google.com/apis/credentials/consent", "_blank")}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Consent Screen
                </Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">3. Add Required Scopes</h4>
                <p className="text-sm text-gray-600 mb-2">In OAuth consent screen, add these scopes:</p>
                <div className="space-y-1">
                  {[
                    "https://www.googleapis.com/auth/gmail.readonly",
                    "https://www.googleapis.com/auth/gmail.modify",
                    "https://www.googleapis.com/auth/userinfo.email",
                    "https://www.googleapis.com/auth/userinfo.profile",
                  ].map((scope) => (
                    <div key={scope} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                      <code className="flex-1">{scope}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(scope, "Scope")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="oauth" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Step 2:</strong> Create OAuth 2.0 credentials in "APIs & Services" → "Credentials"
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">OAuth 2.0 Client Configuration</h4>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium">Application Type:</label>
                    <Badge variant="secondary" className="ml-2">
                      Web Application
                    </Badge>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Authorized JavaScript Origins:</label>
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs mt-1">
                      <code>{currentDomain}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(currentDomain, "Origin URL")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Authorized Redirect URIs:</label>
                    <div className="space-y-1 mt-1">
                      {[`${currentDomain}/api/auth/callback/google`, `${currentDomain}/api/auth/connect-callback`].map(
                        (uri) => (
                          <div key={uri} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                            <code className="flex-1">{uri}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(uri, "Redirect URI")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 bg-transparent"
                  onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Credentials
                </Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">Environment Variables</h4>
                <p className="text-sm text-gray-600 mb-2">
                  After creating OAuth credentials, add these to your .env.local:
                </p>
                <div className="space-y-1">
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <code>GOOGLE_CLIENT_ID=your_client_id_here</code>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-xs">
                    <code>GOOGLE_CLIENT_SECRET=your_client_secret_here</code>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Step 3:</strong> Add test users to avoid "unverified app" warnings
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">Add Test Users</h4>
                <p className="text-sm text-gray-600 mb-2">In OAuth consent screen → "Test users" → Add users:</p>
                <ul className="text-xs space-y-1 text-gray-600">
                  <li>• Add your Gmail addresses that you want to test with</li>
                  <li>• Test users can bypass the "unverified app" warning</li>
                  <li>• You can add up to 100 test users</li>
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 bg-transparent"
                  onClick={() => window.open("https://console.cloud.google.com/apis/credentials/consent", "_blank")}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Add Test Users
                </Button>
              </div>

              <div className="p-3 border rounded-lg">
                <h4 className="font-medium mb-2">Publishing Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                    <span className="text-sm">
                      <strong>Testing:</strong> Only test users can access (current status)
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    <span className="text-sm">
                      <strong>Published:</strong> Anyone can access (requires Google verification)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  For production, submit your app for verification to remove user limits.
                </p>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Common Issues:</strong>
                  <br />• "Access blocked" error → Add your email as test user
                  <br />• "Redirect URI mismatch" → Check redirect URIs match exactly
                  <br />• "Invalid client" → Verify Client ID and Secret in .env.local
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4">
          <Button onClick={() => setIsOpen(false)}>Close Guide</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
