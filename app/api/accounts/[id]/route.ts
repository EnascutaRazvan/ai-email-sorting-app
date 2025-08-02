import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accountId = params.id

    // 1. Delete associated emails first
    const { error: emailDeleteError } = await supabase
      .from("emails")
      .delete()
      .eq("account_id", accountId)
      .eq("user_id", session.user.id)

    if (emailDeleteError) {
      console.error("Error deleting emails for account:", emailDeleteError)
      return NextResponse.json({ error: "Failed to delete associated emails" }, { status: 500 })
    }

    // 2. Delete the user account
    const { error: accountDeleteError } = await supabase
      .from("user_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", session.user.id)

    if (accountDeleteError) {
      console.error("Error deleting account:", accountDeleteError)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Account and associated emails deleted successfully" })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
