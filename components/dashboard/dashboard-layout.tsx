"use client"

import type React from "react"
import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { Mail, Settings, LogOut, Menu, Inbox, Tag, Users, BarChart3, User, Palette } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Inbox", href: "/dashboard", icon: Inbox, current: true },
    { name: "Categories", href: "/dashboard/categories", icon: Tag, current: false },
    { name: "Accounts", href: "/dashboard/accounts", icon: Users, current: false },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, current: false },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, current: false },
  ]

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border bg-surface-1">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-elevation-1">
            <Mail className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-lg font-semibold text-foreground">EmailAI</span>
            <p className="text-xs text-muted-foreground">Smart Email Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              item.current
                ? "bg-primary text-primary-foreground shadow-elevation-1"
                : "text-muted-foreground hover:text-foreground hover:bg-accent hover:shadow-elevation-1"
            }`}
          >
            <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
            {item.name}
          </a>
        ))}
      </nav>

      {/* Theme Toggle in Sidebar */}
      <div className="px-4 py-4 border-t border-border bg-surface-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-surface">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-surface-1/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface-1/80 px-4 sm:gap-x-6 sm:px-6 lg:px-8 shadow-elevation-1">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden hover:bg-accent">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open sidebar</span>
              </Button>
            </SheetTrigger>
          </Sheet>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Theme toggle for desktop */}
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              {/* Profile dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-accent">
                    <Avatar className="h-8 w-8 shadow-elevation-1">
                      <AvatarImage src={session?.user?.image || "/placeholder.svg"} alt={session?.user?.name || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-medium">
                        {session?.user?.name ? (
                          session.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-surface border-border shadow-elevation-3"
                  align="end"
                  forceMount
                >
                  <div className="flex items-center justify-start gap-2 p-3 bg-surface-2 rounded-t-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session?.user?.image || "/placeholder.svg"} alt={session?.user?.name || ""} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                        {session?.user?.name ? (
                          session.user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 leading-none">
                      {session?.user?.name && (
                        <p className="font-medium text-sm text-foreground">{session.user.name}</p>
                      )}
                      {session?.user?.email && (
                        <p className="text-xs text-muted-foreground truncate w-[180px]">{session.user.email}</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="cursor-pointer hover:bg-accent focus:bg-accent">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer sm:hidden hover:bg-accent focus:bg-accent">
                    <Palette className="mr-2 h-4 w-4" />
                    <span>Theme</span>
                    <div className="ml-auto">
                      <ThemeToggle />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="cursor-pointer text-error hover:bg-error/10 focus:bg-error/10 focus:text-error"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 bg-background min-h-[calc(100vh-4rem)]">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
