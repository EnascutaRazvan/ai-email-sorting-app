import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { google } from "googleapis"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { emailIds } = await request.json()

  if (!Array.isArray(emailIds) || emailIds.length === 0) {
    return NextResponse.json({ error: "Invalid email IDs provided" }, { status: 400 })
  }

  let deletedCount = 0
  let gmailDeletedCount = 0
  const errors: string[] = []

  for (const emailId of emailIds) {
    try {
      // 1. Fetch email details from your database
      const { data: email, error: emailError } = await supabase
        .from("emails")
        .select("message_id, account_id")
        .eq("id", emailId)
        .eq("user_id", session.user.id)
        .single()

      if (emailError || !email) {
        errors.push(`Email ${emailId} not found or unauthorized: ${emailError?.message}`)
        continue
      }

      // 2. Fetch account details to get Gmail tokens
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("access_token, refresh_token, expires_at, email")
        .eq("id", email.account_id)
        .eq("user_id", session.user.id)
        .single()

      if (accountError || !account) {
        errors.push(`Account for email ${emailId} not found or unauthorized: ${accountError?.message}`)
        continue
      }

      const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
      oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
      })

      // Refresh token if expired
      if (oauth2Client.isTokenExpired()) {
        const { credentials } = await oauth2Client.refreshAccessToken()
        await supabase
          .from("accounts")
          .update({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token,
            expires_at: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : null,
          })
          .eq("id", email.account_id)
        oauth2Client.setCredentials(credentials)
      }

      const gmail = google.gmail({ version: "v1", auth: oauth2Client })

      // 3. Delete email from Gmail
      try {
        await gmail.users.messages.trash({
          userId: "me",
          id: email.message_id,
        })
        gmailDeletedCount++
      } catch (gmailError: any) {
        errors.push(`Failed to trash email ${email.message_id} in Gmail: ${gmailError.message}`)
        // Continue to delete from DB even if Gmail deletion fails
      }

      // 4. Delete email from your database
      const { error: dbDeleteError } = await supabase
        .from("emails")
        .delete()
        .eq("id", emailId)
        .eq("user_id", session.user.id)

      if (dbDeleteError) {
        errors.push(`Failed to delete email ${emailId} from database: ${dbDeleteError.message}`)
      } else {
        deletedCount++
      }
    } catch (overallError: any) {
      errors.push(`An unexpected error occurred for email ${emailId}: ${overallError.message}`)
    }
  }

  if (errors.length > 0) {
    console.error("Bulk delete errors:", errors)
    return NextResponse.json(
      {
        message: `Completed with ${deletedCount} emails deleted from DB, ${gmailDeletedCount} from Gmail, but with errors.`,
        errors,
      },
      { status: 200 },
    )
  }

  return NextResponse.json({ message: "Emails deleted successfully", deletedCount })
}
