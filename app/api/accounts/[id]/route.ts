import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { id } = params

  const { data: account, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    console.error("Error fetching account:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  return NextResponse.json({ account })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { id } = params

  // First, delete all emails associated with this account
  const { error: deleteEmailsError } = await supabase
    .from("emails")
    .delete()
    .eq("account_id", id)
    .eq("user_id", session.user.id)

  if (deleteEmailsError) {
    console.error("Error deleting associated emails:", deleteEmailsError)
    return NextResponse.json({ error: deleteEmailsError.message }, { status: 500 })
  }

  // Then, delete the account itself
  const { error: deleteAccountError } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)

  if (deleteAccountError) {
    console.error("Error deleting account:", deleteAccountError)
    return NextResponse.json({ error: deleteAccountError.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Account and associated emails deleted successfully" })
}
