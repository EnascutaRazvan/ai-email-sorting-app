import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const { data: existingUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .single()

          let userId = existingUser?.id

          if (!existingUser) {
            // Create new user
            const { data: newUser, error: createUserError } = await supabase
              .from("users")
              .insert({
                email: user.email,
                name: user.name,
                picture: user.image,
              })
              .select()
              .single()

            if (createUserError) {
              console.error("Error creating user:", createUserError)
              return false
            }

            userId = newUser.id
          }

          // Check if account already exists
          const { data: existingAccount } = await supabase
            .from("user_accounts")
            .select("id")
            .eq("user_id", userId)
            .eq("email", user.email)
            .single()

          if (!existingAccount) {
            // Create new account
            const { error: accountError } = await supabase.from("user_accounts").insert({
              user_id: userId,
              email: user.email,
              name: user.name,
              picture: user.image,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              is_primary: true,
            })

            if (accountError) {
              console.error("Error creating account:", accountError)
              return false
            }
          } else {
            // Update existing account tokens
            const { error: updateError } = await supabase
              .from("user_accounts")
              .update({
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingAccount.id)

            if (updateError) {
              console.error("Error updating account:", updateError)
              return false
            }
          }

          user.id = userId
          return true
        } catch (error) {
          console.error("Sign in error:", error)
          return false
        }
      }
      return true
    },
    async session({ session, token }: any) {
      if (token?.sub) {
        session.user.id = token.sub
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
