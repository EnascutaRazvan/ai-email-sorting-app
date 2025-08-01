import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { GmailService } from "@/lib/gmail"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "No email IDs provided" }, { status: 400 })
    }

    // Get email details with account information
    const { data: emails, error: fetchError } = await supabase
      .from("emails")
      .select(`
        id,
        gmail_id,
        account_id,
        user_accounts!inner(access_token, refresh_token)
      `)
      .in("id", emailIds)
      .eq("user_id", session.user.id)

    if (fetchError) {
      console.error("Error fetching emails for deletion:", fetchError)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "No emails found" }, { status: 404 })
    }

    let deletedCount = 0
    const errors = []

    // Group emails by account to minimize Gmail API calls
    const emailsByAccount = emails.reduce(
      (acc, email) => {
        const accountId = email.account_id
        if (!acc[accountId]) {
          acc[accountId] = {
            account: email.user_accounts,
            emails: [],
          }
        }
        acc[accountId].emails.push(email)
        return acc
      },
      {} as Record<string, any>,
    )

    // Delete emails from Gmail and database
    for (const [accountId, { account, emails: accountEmails }] of Object.entries(emailsByAccount)) {
      try {
        const gmailService = new GmailService(account.access_token, account.refresh_token)

        for (const email of accountEmails) {
          try {
            // Delete from Gmail
            await gmailService.deleteEmail(email.gmail_id)

            // Delete from database
            const { error: deleteError } = await supabase
              .from("emails")
              .delete()
              .eq("id", email.id)
              .eq("user_id", session.user.id)

            if (deleteError) {
              console.error(`Error deleting email ${email.id} from database:`, deleteError)
              errors.push(`Failed to delete email ${email.id} from database`)
              continue
            }

            deletedCount++
          } catch (emailError) {
            console.error(`Error deleting email ${email.gmail_id}:`, emailError)
            errors.push(`Failed to delete email ${email.gmail_id}`)
            continue
          }
        }
      } catch (accountError) {
        console.error(`Error processing account ${accountId}:`, accountError)
        errors.push(`Failed to process account ${accountId}`)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      totalRequested: emailIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully deleted ${deletedCount} out of ${emailIds.length} emails`,
    })
  } catch (error) {
    console.error("Bulk delete error:", error)
    return NextResponse.json({ error: "Failed to delete emails", details: error.message }, { status: 500 })
  }
}
