import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/auth/signin", request.url))
    }

    // Extract parameters from the session token
    const { accessToken, refreshToken, expires_at, email, name } = session as any

    if (!accessToken || !refreshToken || !expires_at || !email) {
      console.error("Missing token details in session for account connection callback.")
      return NextResponse.redirect(new URL("/dashboard?error=missing_auth_details", request.url))
    }

    // Check if an account with this email already exists for this user
    const { data: existingAccount, error: fetchError } = await supabase
      .from("user_accounts")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("email", email)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found
      console.error("Error checking existing account in callback:", fetchError)
      return NextResponse.redirect(new URL("/dashboard?error=database_error", request.url))
    }

    if (existingAccount) {
      // Account already connected, redirect to dashboard with a message
      return NextResponse.redirect(new URL("/dashboard?message=account_already_connected", request.url))
    }

    // Insert the new account into user_accounts table
    const { data, error } = await supabase
      .from("user_accounts")
      .insert({
        user_id: session.user.id,
        email,
        name: name || email,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(expires_at * 1000).toISOString(), // Convert seconds to ISO string
        provider: "google", // Assuming Google for now
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving connected account:", error)
      return NextResponse.redirect(new URL("/dashboard?error=failed_to_connect_account", request.url))
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(new URL("/dashboard?message=account_connected", request.url))
  } catch (error) {
    console.error("Callback API error:", error)
    return NextResponse.redirect(new URL("/dashboard?error=internal_server_error", request.url))
  }
}
