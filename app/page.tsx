"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Zap, Shield, Brain, ArrowRight, CheckCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  const handleSignIn = () => {
    router.push("/auth/signin")
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/logo_app.png" alt="App Logo" className="h-16 w-16 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">EmailAI Sorter</h1>
              <p className="text-xs text-muted-foreground">AI-powered</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button onClick={handleSignIn} className="bg-primary hover:bg-primary/90">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20">
            <Zap className="mr-1 h-3 w-3" />
            AI-Powered Email Management
          </Badge>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Organize Your Emails with
            <span className="text-primary block">Artificial Intelligence</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Stop drowning in emails. Our AI automatically categorizes, summarizes, and helps you unsubscribe from
            unwanted emails, giving you back control of your inbox.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button onClick={handleSignIn} size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to take control of your email workflow
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="glass border-border/50 hover:border-border transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-foreground">AI Categorization</CardTitle>
              <CardDescription className="text-muted-foreground">
                Automatically sorts emails into smart categories using advanced AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Smart category detection
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Custom category creation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Bulk email organization
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass border-border/50 hover:border-border transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-foreground">Smart Summaries</CardTitle>
              <CardDescription className="text-muted-foreground">
                Get instant AI-generated summaries of your emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Key points extraction
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Action items detection
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Priority assessment
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass border-border/50 hover:border-border transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-foreground">Auto Unsubscribe</CardTitle>
              <CardDescription className="text-muted-foreground">
                Automatically unsubscribe from unwanted mailing lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Bulk unsubscribe
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Safe & secure process
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  Detailed reports
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="glass border-border/50 max-w-4xl mx-auto text-center">
          <CardHeader className="pb-8">
            <CardTitle className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your Email Experience?
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of users who have already taken control of their inbox with AI-powered email management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignIn} size="lg" className="bg-primary hover:bg-primary/90 text-lg px-8 py-6">
              Start Organizing Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Free to start • No setup required • Secure with Google OAuth
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Mail className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">EmailAI Sorter</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EmailAI Sorter. Built with AI for better email management.
          </p>
        </div>
      </footer>
    </div>
  )
}
