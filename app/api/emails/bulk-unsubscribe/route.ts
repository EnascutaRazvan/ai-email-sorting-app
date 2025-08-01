import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

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

    // Get email details
    const { data: emails, error: fetchError } = await supabase
      .from("emails")
      .select("id, body, sender, subject")
      .in("id", emailIds)
      .eq("user_id", session.user.id)

    if (fetchError) {
      console.error("Error fetching emails for unsubscribe:", fetchError)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "No emails found" }, { status: 404 })
    }

    // Extract unsubscribe links from emails
    const unsubscribeLinks = []
    const unsubscribeRegex = /https?:\/\/[^\s<>"]+(?:unsubscribe|opt-out|remove)[^\s<>"]*/gi

    for (const email of emails) {
      const matches = email.body?.match(unsubscribeRegex) || []
      for (const link of matches) {
        unsubscribeLinks.push({
          emailId: email.id,
          sender: email.sender,
          subject: email.subject,
          link: link.replace(/[<>"]/g, ""), // Clean up the link
        })
      }
    }

    if (unsubscribeLinks.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No unsubscribe links found in the selected emails",
        processedCount: 0,
      })
    }

    // For now, we'll just return the found links
    // In a production environment, you would send these to your Puppeteer service on Fly.io
    // TODO: Implement Puppeteer service integration

    console.log("Found unsubscribe links:", unsubscribeLinks)

    // Mark emails as processed for unsubscribe
    const { error: updateError } = await supabase
      .from("emails")
      .update({
        updated_at: new Date().toISOString(),
        // You could add a field to track unsubscribe attempts
      })
      .in("id", emailIds)
      .eq("user_id", session.user.id)

    if (updateError) {
      console.error("Error updating emails:", updateError)
    }

    return NextResponse.json({
      success: true,
      message: `Found ${unsubscribeLinks.length} unsubscribe links in ${emails.length} emails`,
      unsubscribeLinks,
      processedCount: emails.length,
      // TODO: Add actual unsubscribe results when Puppeteer service is implemented
      note: "Unsubscribe links detected. Puppeteer automation will be implemented in the next phase.",
    })
  } catch (error) {
    console.error("Bulk unsubscribe error:", error)
    return NextResponse.json({ error: "Failed to process unsubscribe", details: error.message }, { status: 500 })
  }
}
