import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { UnsubscribeAgent } from "@/lib/unsubscribe-agent"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty emailIds array" }, { status: 400 })
    }

    // Fetch emails with their full content to find unsubscribe links
    const { data: emailsToUnsubscribe, error: fetchError } = await supabase
      .from("emails")
      .select("id, subject, sender, full_content")
      .in("id", emailIds)
      .eq("user_id", session.user.id)

    if (fetchError) {
      console.error("Error fetching emails for unsubscribe:", fetchError)
      return NextResponse.json({ error: "Failed to fetch emails for unsubscribe" }, { status: 500 })
    }

    if (!emailsToUnsubscribe || emailsToUnsubscribe.length === 0) {
      return NextResponse.json({ message: "No emails found to unsubscribe from." })
    }

    const unsubscribeAgent = new UnsubscribeAgent()
    const results = []
    let totalProcessed = 0
    let totalSuccessful = 0

    for (const email of emailsToUnsubscribe) {
      totalProcessed++
      try {
        const unsubscribeResult = await unsubscribeAgent.processEmail(email.id, email.full_content || "")
        results.push({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          success: unsubscribeResult.success,
          summary: unsubscribeResult.summary,
          details: unsubscribeResult.details,
        })
        if (unsubscribeResult.success) {
          totalSuccessful++
          // Optionally, delete the email from the database after successful unsubscribe
          await supabase.from("emails").delete().eq("id", email.id)
        }
      } catch (error: any) {
        console.error(`Error processing unsubscribe for email ${email.id}:`, error)
        results.push({
          emailId: email.id,
          subject: email.subject,
          sender: email.sender,
          success: false,
          summary: `Failed to process unsubscribe: ${error.message}`,
          details: [],
        })
      }
    }

    return NextResponse.json({ success: true, results, totalProcessed, totalSuccessful })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
