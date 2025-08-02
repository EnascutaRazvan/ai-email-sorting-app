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

    // Prevent deletion of primary account
    const { data: account, error: fetchError } = await supabase
      .from("user_accounts")
      .select("is_primary, email")
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single()

    if (fetchError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (account.is_primary) {
      return NextResponse.json({ error: "Cannot remove primary account" }, { status: 400 })
    }

    // First, update all emails from this account to mark them as from a disconnected account
    // We'll set account_id to null and update a display field to show it was disconnected
    const { error: emailUpdateError } = await supabase
      .from("emails")
      .update({
        account_id: null,
        // Store the original account email for display purposes
        disconnected_account_email: account.email,
      })
      .eq("account_id", params.id)
      .eq("user_id", session.user.id)

    if (emailUpdateError) {
      console.error("Error updating emails for disconnected account:", emailUpdateError)
      return NextResponse.json({ error: "Failed to update emails for account removal" }, { status: 500 })
    }

    // Now delete the account
    const { error } = await supabase.from("user_accounts").delete().eq("id", params.id).eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting account:", error)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
