import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") // This is the user ID
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=access_denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=missing_params`)
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/connect-callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=token_exchange_failed`)
    }

    // Get user info from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userInfoResponse.json()

    if (!userInfo.id || !userInfo.email) {
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=user_info_failed`)
    }

    // Store the additional account
    const { error: dbError } = await supabase.from("user_accounts").upsert(
      {
        user_id: state, // The original user ID from NextAuth
        gmail_id: userInfo.id,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        is_primary: false, // This is an additional account
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,gmail_id",
      },
    )

    if (dbError) {
      console.error("Error storing additional account:", dbError)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=storage_failed`)
    }

    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?success=account_connected`)
  } catch (error) {
    console.error("Connect callback error:", error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=unexpected_error`)
  }
}
