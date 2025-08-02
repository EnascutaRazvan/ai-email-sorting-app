import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { UnsubscribeAgent } from "@/lib/unsubscribe-agent"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface GmailMessage {
  id: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "Invalid email IDs provided" }, { status: 400 })
    }

    // Fetch email records with account info
    const { data: emails, error: fetchError } = await supabase
      .from("emails")
      .select(`
        id, 
        subject, 
        sender, 
        snippet,
        ai_summary,
        account_id,
        user_accounts!inner(access_token)
      `)
      .in("id", emailIds)
      .eq("user_id", session.user.id)

    if (fetchError) {
      console.error("Error fetching emails:", fetchError)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    const unsubscribeAgent = new UnsubscribeAgent()
    const results = []
    let successfulUnsubscribes = 0

    // Process each email for unsubscribe
    for (const email of emails) {
      try {
        // Fetch fresh email content from Gmail API
        const freshContent = await fetchFreshEmailContent(email.id, email.user_accounts.access_token)

        const unsubscribeResult = await unsubscribeAgent.unsubscribeFromEmail(freshContent)

        results.push({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          success: unsubscribeResult.success,
          summary: unsubscribeResult.summary,
          details: unsubscribeResult.results,
        })

        if (unsubscribeResult.success) {
          successfulUnsubscribes++

          // Update email record with unsubscribe status
          const updatedSummary = `${email.ai_summary || ""}\n\n[UNSUBSCRIBED: ${unsubscribeResult.summary}]`.trim()

          await supabase
            .from("emails")
            .update({
              ai_summary: updatedSummary,
            })
            .eq("id", email.id)
        }

        // Add delay between processing emails
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error)
        results.push({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          success: false,
          summary: `Error: ${error.message}`,
          details: [],
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: emails.length,
      successful: successfulUnsubscribes,
      results,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function fetchFreshEmailContent(messageId: string, accessToken: string): Promise<string> {
  try {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch email: ${response.statusText}`)
    }

    const message: GmailMessage = await response.json()
    return extractEmailBody(message.payload)
  } catch (error) {
    console.error("Error fetching fresh email content:", error)
    throw error
  }
}

function extractEmailBody(payload: any): string {
  let body = ""

  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8")
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8")
        break
      } else if (part.mimeType === "text/plain" && part.body?.data && !body) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8")
      }
    }
  }

  return body || "No content available"
}
