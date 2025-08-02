import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty emailIds array" }, { status: 400 })
    }

    const { error } = await supabase.from("emails").delete().in("id", emailIds).eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting emails:", error)
      return NextResponse.json({ error: "Failed to delete emails" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Successfully deleted ${emailIds.length} emails.` })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
