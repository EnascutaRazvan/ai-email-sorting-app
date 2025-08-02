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

    // Build Google OAuth URL with all required parameters
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
      prompt: "consent select_account", // Force account selection and consent
      state: state,
      include_granted_scopes: "true", // Include previously granted scopes
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    // Log the connection attempt for security monitoring
    console.log(`OAuth connection initiated for user ${session.user.id} at ${new Date().toISOString()}`)

    return NextResponse.json({
      authUrl,
      state, // Return state for client-side verification if needed
      scopes: ["Gmail Read Access", "Gmail Modify Access", "Profile Information"],
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
