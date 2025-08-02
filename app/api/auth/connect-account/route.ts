import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, name, accessToken, refreshToken, expiresAt } = await request.json()

    if (!email || !accessToken || !refreshToken || !expiresAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
      console.error("Error checking existing account:", fetchError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (existingAccount) {
      return NextResponse.json({ success: false, message: "Account already connected." }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("user_accounts")
      .insert({
        user_id: session.user.id,
        email,
        name: name || email,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: new Date(expiresAt * 1000).toISOString(), // Convert seconds to ISO string
        provider: "google", // Assuming Google for now
      })
      .select()
      .single()

    if (error) {
      console.error("Error connecting account:", error)
      return NextResponse.json({ error: "Failed to connect account" }, { status: 500 })
    }

    return NextResponse.json({ success: true, account: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
