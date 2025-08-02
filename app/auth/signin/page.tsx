"use client"

import { signIn, getSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { ChromeIcon } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession()
      if (session) {
        router.push("/dashboard")
      }
    }
    checkSession()
  }, [router])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Sign In</CardTitle>
          <CardDescription>Sign in to your account to manage your emails.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button variant="outline" className="w-full bg-transparent" onClick={handleSignIn} disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Signing in...
              </div>
            ) : (
              <div className="flex items-center">
                <ChromeIcon className="mr-2 h-5 w-5" />
                Sign in with Google
              </div>
            )}
          </Button>
          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-center mb-2">
              <Sparkles className="h-4 w-4 mr-1" />
              <span>Powered by AI</span>
            </div>
            <p>We'll access your Gmail to categorize and manage your emails</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
