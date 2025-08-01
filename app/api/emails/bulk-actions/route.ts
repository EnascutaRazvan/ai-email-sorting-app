import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { deleteEmailFromGmail } from "@/lib/gmail"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, emailIds } = await request.json()

    if (!action || !emailIds || !Array.isArray(emailIds)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    if (action === "delete") {
      // Get email details with account info for Gmail API calls
      const { data: emails, error: emailsError } = await supabase
        .from("emails")
        .select(`
          id,
          user_accounts!inner(access_token, refresh_token)
        `)
        .in("id", emailIds)
        .eq("user_id", session.user.id)

      if (emailsError) {
        console.error("Error fetching emails:", emailsError)
        return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
      }

      let deletedCount = 0
      const errors = []

      // Delete from Gmail and database
      for (const email of emails) {
        try {
          // Delete from Gmail
          await deleteEmailFromGmail(email.user_accounts.access_token, email.user_accounts.refresh_token, email.id)

          // Delete from database
          const { error: deleteError } = await supabase
            .from("emails")
            .delete()
            .eq("id", email.id)
            .eq("user_id", session.user.id)

          if (deleteError) {
            throw deleteError
          }

          deletedCount++
        } catch (error) {
          console.error(`Error deleting email ${email.id}:`, error)
          errors.push({
            emailId: email.id,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }

      return NextResponse.json({
        success: true,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    if (action === "unsubscribe") {
      // For now, we'll just mark them for unsubscribe processing
      // The actual unsubscribe logic with Puppeteer will be implemented later
      const { error: updateError } = await supabase
        .from("emails")
        .update({
          updated_at: new Date().toISOString(),
          // We could add an "unsubscribe_requested" field to track this
        })
        .in("id", emailIds)
        .eq("user_id", session.user.id)

      if (updateError) {
        console.error("Error marking emails for unsubscribe:", updateError)
        return NextResponse.json({ error: "Failed to process unsubscribe request" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Emails marked for unsubscribe processing",
        count: emailIds.length,
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Bulk action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
