import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import type { NextAuthOptions } from "next-auth" // Import NextAuthOptions type

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const authOptions: NextAuthOptions = {
  // Export authOptions
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // console.log("signIn callback - user:", user) // Removed console.log
      if (account?.provider === "google") {
        try {
          // Store user in Supabase
          const { error: userError } = await supabase.from("users").upsert({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            updated_at: new Date().toISOString(),
          })

          if (userError) {
            console.error("Error storing user:", userError)
            return false
          }

          // Store account information
          const { error: accountError } = await supabase.from("user_accounts").upsert(
            {
              user_id: user.id,
              gmail_id: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              email: user.email,
              is_primary: true,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,gmail_id",
            },
          )

          if (accountError) {
            console.error("Error storing account:", accountError)
            return false
          }

          return true
        } catch (error) {
          console.error("Sign in error:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      if (user) {
        token.id = user.id
      }
      // console.log("jwt callback - token:", token) // Removed console.log
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.id = token.id as string
      // console.log("session callback - token:", token) // Removed console.log
      // console.log("session callback - session:", session) // Removed console.log
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

const handler = NextAuth(authOptions) // Pass authOptions to NextAuth

export { handler as GET, handler as POST }
