import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "not found"
      console.error("Error fetching settings:", error)
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
    }

    // Return default settings if none exist
    const defaultSettings = {
      auto_sync_enabled: true,
      emails_per_page: 10,
    }

    return NextResponse.json({
      settings: settings || defaultSettings,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { auto_sync_enabled, emails_per_page } = body

    const { data: settings, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: session.user.id,
          auto_sync_enabled: auto_sync_enabled ?? true,
          emails_per_page: emails_per_page ?? 10,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating settings:", error)
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
