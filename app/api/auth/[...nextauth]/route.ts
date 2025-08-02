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
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: { token: any; account: any; profile?: any }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.idToken = account.id_token
        token.provider = account.provider
        token.expires_at = account.expires_at
        token.profile = profile // Store Google profile info
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken
      session.refreshToken = token.refreshToken
      session.idToken = token.idToken
      session.provider = token.provider
      session.expires_at = token.expires_at
      session.user.id = token.sub // Google's unique user ID
      session.user.email = token.email
      session.user.name = token.name
      session.user.image = token.picture

      // Upsert user into Supabase
      if (session.user.id) {
        const { data, error } = await supabase
          .from("users")
          .upsert(
            {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
              image: session.user.image,
            },
            { onConflict: "id" },
          )
          .select()

        if (error) {
          console.error("Error upserting user:", error)
        } else {
          // console.log("User upserted:", data);
        }
      }

      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
