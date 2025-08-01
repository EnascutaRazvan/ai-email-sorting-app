import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate a secure state parameter
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2, 15),
      }),
    ).toString("base64url")

    // Build Google OAuth URL with parameters that force account selection
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/connect-callback`,
      response_type: "code",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.modify",
      ].join(" "),
      access_type: "offline",
      // Key parameters for multi-account support
      prompt: "select_account consent", // Force account selection AND consent
      include_granted_scopes: "false", // Don't include previously granted scopes
      state: state,
      // Add hint to encourage different account selection
      login_hint: "", // Empty login_hint forces account chooser
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    // Log the connection attempt for debugging
    console.log(`Multi-account OAuth initiated for user ${session.user.id}`)

    return NextResponse.json({
      authUrl,
      instructions: {
        step1: "You will see Google's account chooser",
        step2: "Select a DIFFERENT account than your current one",
        step3: "If you don't see other accounts, click 'Use another account'",
        step4: "Sign in with the account you want to connect",
      },
    })
  } catch (error) {
    console.error("Error generating connect URL:", error)
    return NextResponse.json(
      {
        error: "Failed to generate authorization URL",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    )
  }
}
