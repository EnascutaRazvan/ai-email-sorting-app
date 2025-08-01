import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get email from database
    const { data: email, error } = await supabase
      .from("emails")
      .select(`
        *,
        user_accounts!inner(access_token)
      `)
      .eq("id", params.id)
      .eq("user_id", session.user.id)
      .single()

    if (error || !email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // If we have stored email body, return it
    if (email.email_body) {
      return NextResponse.json({
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        received_at: email.received_at,
        body: email.email_body,
        ai_summary: email.ai_summary,
      })
    }

    // Otherwise, fetch from Gmail API
    const gmailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.id}`, {
      headers: {
        Authorization: `Bearer ${email.user_accounts.access_token}`,
      },
    })

    if (!gmailResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 })
    }

    const gmailMessage = await gmailResponse.json()
    const emailBody = extractEmailBody(gmailMessage.payload)

    // Update database with email body for future requests
    await supabase.from("emails").update({ email_body: emailBody }).eq("id", params.id)

    return NextResponse.json({
      id: email.id,
      subject: email.subject,
      sender: email.sender,
      received_at: email.received_at,
      body: emailBody,
      ai_summary: email.ai_summary,
    })
  } catch (error) {
    console.error("Error fetching email content:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function extractEmailBody(payload: any): string {
  let body = ""

  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8")
  } else if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8")
        break
      } else if (part.mimeType === "text/html" && part.body?.data && !body) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8")
      }
    }
  }

  return body || "No content available"
}
