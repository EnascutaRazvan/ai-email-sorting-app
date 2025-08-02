import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "No email IDs provided" }, { status: 400 })
    }

    // Delete emails from database
    const { data, error } = await supabase
      .from("emails")
      .delete()
      .in("id", emailIds)
      .eq("user_email", session.user.email)

    if (error) {
      console.error("Error deleting emails:", error)
      return NextResponse.json({ error: "Failed to delete emails" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedCount: emailIds.length,
      message: `Successfully deleted ${emailIds.length} emails`,
    })
  } catch (error) {
    console.error("Error in bulk delete:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
