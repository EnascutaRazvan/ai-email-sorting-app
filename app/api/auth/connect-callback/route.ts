import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../[...nextauth]/route"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.redirect(new URL("/auth/signin?error=unauthorized", request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") // In a real app, verify this state

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?error=no_code", request.url))
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/connect-callback`,
        grant_type: "authorization_code",
      }).toString(),
    })

    const tokens = await tokenResponse.json()

    if (tokens.error) {
      console.error("Error exchanging code for tokens:", tokens.error_description || tokens.error)
      return NextResponse.redirect(new URL(`/dashboard?error=${tokens.error}`, request.url))
    }

    // Get user info from Google to get the email
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })
    const userInfo = await userInfoResponse.json()

    if (userInfo.error) {
      console.error("Error fetching user info:", userInfo.error_description || userInfo.error)
      return NextResponse.redirect(new URL(`/dashboard?error=${userInfo.error}`, request.url))
    }

    const supabase = createClient()

    // Store the new account details in your database
    const { data, error } = await supabase.from("accounts").upsert(
      {
        user_id: session.user.id,
        provider: "google",
        provider_account_id: userInfo.sub, // Google's unique user ID
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
        id_token: tokens.id_token,
        email: userInfo.email,
        name: userInfo.name,
        image: userInfo.picture,
      },
      { onConflict: "provider_account_id" }, // Update if account already exists
    )

    if (error) {
      console.error("Error saving new account:", error)
      return NextResponse.redirect(new URL(`/dashboard?error=${error.message}`, request.url))
    }

    // Redirect back to dashboard or a success page
    return NextResponse.redirect(new URL("/dashboard?status=account_connected", request.url))
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(new URL("/dashboard?error=oauth_failed", request.url))
  }
}
