import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"
import { UnsubscribeAgent } from "@/lib/unsubscribe-agent"
import { google } from "googleapis"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function getGmailContent(accessToken: string, messageId: string): Promise<string> {
  try {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    const message = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    })

    // Extract email content from Gmail API response
    let content = ""

    if (message.data.payload?.parts) {
      // Multi-part message
      for (const part of message.data.payload.parts) {
        if (part.mimeType === "text/html" || part.mimeType === "text/plain") {
          if (part.body?.data) {
            content += Buffer.from(part.body.data, "base64").toString("utf-8")
          }
        }
      }
    } else if (message.data.payload?.body?.data) {
      // Single part message
      content = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8")
    }

    return content
  } catch (error) {
    console.error("Error fetching Gmail content:", error)
    throw new Error("Failed to fetch fresh email content from Gmail")
  }
}

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

    // Get user's access token
    const { data: accounts } = await supabase
      .from("accounts")
      .select("access_token, gmail_message_id")
      .eq("user_email", session.user.email)
      .eq("provider", "google")
      .single()

    if (!accounts?.access_token) {
      return NextResponse.json({ error: "No Gmail access token found" }, { status: 400 })
    }

    // Get email details from database
    const { data: emails, error: emailsError } = await supabase
      .from("emails")
      .select("id, subject, sender, gmail_message_id")
      .in("id", emailIds)
      .eq("user_email", session.user.email)

    if (emailsError || !emails) {
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    const unsubscribeAgent = new UnsubscribeAgent()
    const results = []

    for (const email of emails) {
      try {
        // Fetch fresh content from Gmail
        const freshContent = await getGmailContent(accounts.access_token, email.gmail_message_id)

        // Process unsubscribe
        const result = await unsubscribeAgent.unsubscribeFromEmail(freshContent)

        results.push({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          ...result,
        })

        // Update email status in database
        await supabase
          .from("emails")
          .update({
            unsubscribe_attempted: true,
            unsubscribe_success: result.success,
            unsubscribe_details: JSON.stringify(result.results),
          })
          .eq("id", email.id)
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
        results.push({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          success: false,
          results: [],
          summary: `Error: ${error.message}`,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: successCount > 0,
      totalProcessed: results.length,
      successCount,
      results,
      summary: `Processed ${results.length} emails, ${successCount} successful unsubscribes`,
    })
  } catch (error) {
    console.error("Error in bulk unsubscribe:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
