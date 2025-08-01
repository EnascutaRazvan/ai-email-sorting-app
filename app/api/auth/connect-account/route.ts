import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build Google OAuth URL for additional account
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/connect-callback`,
      response_type: "code",
      scope:
        "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
      access_type: "offline",
      prompt: "consent", // Remove select_account for now
      state: session.user.id,
      // Add a parameter to help identify this is for additional account
      login_hint: "additional_account",
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.json({
      authUrl,
      requiresSignOut: true,
      message:
        "To connect a different account, you may need to sign out of Google first, then return and click this link again.",
    })
  } catch (error) {
    console.error("Error generating connect URL:", error)
    return NextResponse.json({ error: "Failed to generate auth URL" }, { status: 500 })
  }
}
