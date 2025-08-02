"use client"

import type React from "react"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, LogOut, Settings, User } from "lucide-react"
import { Sidebar } from "@/components/ui/sidebar"
import { useMediaQuery } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "next-auth/react"
import Image from "next/image"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const { data: session } = useSession()

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return "NA"
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar className="hidden lg:flex flex-col border-r bg-card text-card-foreground">
          <div className="flex items-center justify-center h-16 border-b px-4">
            <Image src="/placeholder-logo.svg" alt="Logo" width={32} height={32} className="mr-2" />
            <span className="text-lg font-semibold text-foreground">EmailSorter</span>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {/* Navigation items can go here if needed, currently handled by main dashboard page */}
          </nav>
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start h-auto p-2">
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarImage
                      src={session?.user?.image || "/placeholder-user.jpg"}
                      alt={session?.user?.name || session?.user?.email || "User"}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(session?.user?.name, session?.user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-foreground">
                      {session?.user?.name || session?.user?.email}
                    </span>
                    <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Sidebar>
      )}

      {/* Mobile Header and Sidebar */}
      {!isDesktop && (
        <header className="flex h-16 w-full items-center justify-between border-b bg-card px-4 lg:hidden">
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar className="flex flex-col h-full border-r-0">
                <div className="flex items-center justify-center h-16 border-b px-4">
                  <Image src="/placeholder-logo.svg" alt="Logo" width={32} height={32} className="mr-2" />
                  <span className="text-lg font-semibold text-foreground">EmailSorter</span>
                </div>
                <nav className="flex-1 p-4 space-y-2">{/* Navigation items */}</nav>
                <div className="p-4 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="w-full justify-start h-auto p-2">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage
                            src={session?.user?.image || "/placeholder-user.jpg"}
                            alt={session?.user?.name || session?.user?.email || "User"}
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(session?.user?.name, session?.user?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium text-foreground">
                            {session?.user?.name || session?.user?.email}
                          </span>
                          <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Sidebar>
            </SheetContent>
            <div className="flex items-center">
              <Image src="/placeholder-logo.svg" alt="Logo" width={32} height={32} className="mr-2" />
              <span className="text-lg font-semibold text-foreground">EmailSorter</span>
            </div>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session?.user?.image || "/placeholder-user.jpg"}
                    alt={session?.user?.name || session?.user?.email || "User"}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(session?.user?.name, session?.user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
