import { NextResponse } from "next/server"
import { authOptions } from "../[...nextauth]/route"
import { getServerSession } from "next-auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()

  // Generate a unique state parameter to prevent CSRF
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  // Store the state in Supabase or a secure cookie for verification later
  // For simplicity, we'll just redirect directly to Google's OAuth URL
  // In a real app, you'd store this state with the user's session.

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.NEXTAUTH_URL}/api/auth/connect-callback&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.insert https://www.googleapis.com/auth/gmail.labels https://www.googleapis.com/auth/gmail.metadata https://www.googleapis.com/auth/gmail.settings https://www.googleapis.com/auth/gmail.addons.current.message.readonly https://www.googleapis.com/auth/gmail.addons.current.message.metadata https://www.googleapis.com/auth/gmail.addons.current.message.action https://www.googleapis.com/auth/gmail.addons.current.action.compose&access_type=offline&prompt=consent&state=${state}`

  return NextResponse.redirect(authUrl)
}
