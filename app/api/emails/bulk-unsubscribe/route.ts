import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { UnsubscribeAgent } from "@/lib/unsubscribe-agent"

export const maxDuration = 60 // Allow up to 60 seconds for Vercel functions

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

    // Fetch email content for the selected emails
    const { data: emails, error: fetchError } = await supabase
      .from("emails")
      .select("id, email_body, snippet, sender, subject, ai_summary")
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
        // The agent needs the full body to find the link
        const emailContent = email.email_body || email.snippet || ""
        if (!emailContent) {
          results.push({
            emailId: email.id,
            subject: email.subject,
            sender: email.sender,
            success: false,
            summary: "Email content is empty, cannot find unsubscribe link.",
            details: [],
          })
          continue
        }

        const unsubscribeResult = await unsubscribeAgent.unsubscribeFromEmail(emailContent)

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

          // Mark email as processed/unsubscribed in database
          await supabase
            .from("emails")
            .update({
              ai_summary: `${email.ai_summary || ""}\n\n[UNSUBSCRIBED: ${unsubscribeResult.summary}]`.trim(),
            })
            .eq("id", email.id)
        }
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
