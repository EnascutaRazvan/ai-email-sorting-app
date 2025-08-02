import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"
import { handleError } from "@/lib/error-handler"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accountId = params.id

    // First, get the account details to retrieve the email
    const { data: accountData, error: accountError } = await supabase
      .from("user_accounts")
      .select("email")
      .eq("id", accountId)
      .single()

    if (accountError) {
      console.error("Error fetching account for deletion:", accountError)
      return handleError(accountError, "Failed to fetch account for deletion", 500)
    }

    if (!accountData) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const disconnectedEmail = accountData.email

    // Update emails associated with this account to set account_id to NULL
    // and store the disconnected email.
    const { error: updateEmailsError } = await supabase
      .from("emails")
      .update({
        account_id: null,
        disconnected_account_email: disconnectedEmail,
      })
      .eq("account_id", accountId)

    if (updateEmailsError) {
      console.error("Error updating emails for disconnected account:", updateEmailsError)
      return handleError(updateEmailsError, "Failed to update emails for disconnected account", 500)
    }

    // Now delete the account from the user_accounts table
    const { error: deleteAccountError } = await supabase
      .from("user_accounts")
      .delete()
      .eq("id", accountId)
      .eq("user_id", session.user.id) // Ensure user can only delete their own accounts

    if (deleteAccountError) {
      console.error("Error deleting account:", deleteAccountError)
      return handleError(deleteAccountError, "Failed to delete account", 500)
    }

    return NextResponse.json({ message: "Account disconnected successfully. Emails are now hidden." })
  } catch (error) {
    console.error("Unexpected error during account deletion:", error)
    return handleError(error, "An unexpected error occurred during account deletion", 500)
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accountId = params.id

    const { data, error } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", session.user.id)
      .single()

    if (error) {
      console.error("Error fetching account:", error)
      return handleError(error, "Failed to fetch account", 500)
    }

    if (!data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error fetching account:", error)
    return handleError(error, "An unexpected error occurred", 500)
  }
}
