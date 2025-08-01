import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.redirect("/auth/signin")
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state") || "/dashboard"
    const error = searchParams.get("error")

    if (error) {
      console.error("OAuth error:", error)
      return NextResponse.redirect(`${state}?error=oauth_error`)
    }

    if (!code) {
      return NextResponse.redirect(`${state}?error=no_code`)
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
      console.error("No access token received:", tokens)
      return NextResponse.redirect(`${state}?error=token_error`)
    }

    // Get user info
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userResponse.json()

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from("user_accounts")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("email", userInfo.email)
      .single()

    if (existingAccount) {
      // Update existing account
      await supabase
        .from("user_accounts")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingAccount.id)
    } else {
      // Create new account
      await supabase.from("user_accounts").insert({
        user_id: session.user.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        is_primary: false,
      })
    }

    return NextResponse.redirect(`${state}?success=account_connected`)
  } catch (error) {
    console.error("Error in connect callback:", error)
    return NextResponse.redirect("/dashboard?error=connection_failed")
  }
}
