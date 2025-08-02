import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"
import { google } from "googleapis"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { id: emailId } = params

  try {
    // Fetch email details from your database
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("message_id, account_id, is_read")
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .single()

    if (emailError || !email) {
      console.error("Error fetching email from DB:", emailError)
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // Fetch account details to get Gmail tokens
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("access_token, refresh_token, expires_at, email")
      .eq("id", email.account_id)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      console.error("Error fetching account from DB:", accountError)
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
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
      oauth2Client.setCredentials(credentials) // Update client with new tokens
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    // Fetch the full email content from Gmail
    const gmailResponse = await gmail.users.messages.get({
      userId: "me",
      id: email.message_id,
      format: "full",
    })

    const payload = gmailResponse.data.payload
    let htmlContent = ""
    let textContent = ""

    const getPartContent = (part: any) => {
      if (part.body && part.body.data) {
        return Buffer.from(part.body.data, "base64").toString("utf8")
      }
      return ""
    }

    const traverseParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.mimeType === "text/html") {
          htmlContent = getPartContent(part)
        } else if (part.mimeType === "text/plain") {
          textContent = getPartContent(part)
        } else if (part.parts) {
          traverseParts(part.parts)
        }
      }
    }

    if (payload?.parts) {
      traverseParts(payload.parts)
    } else if (payload?.body?.data) {
      // Handle cases where content is directly in payload body
      if (payload.mimeType === "text/html") {
        htmlContent = getPartContent(payload)
      } else if (payload.mimeType === "text/plain") {
        textContent = getPartContent(payload)
      }
    }

    // Mark email as read in Gmail if it was unread
    if (!email.is_read) {
      await gmail.users.messages.modify({
        userId: "me",
        id: email.message_id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
          addLabelIds: ["SEEN"],
        },
      })
      // Update is_read status in your database
      await supabase.from("emails").update({ is_read: true }).eq("id", emailId).eq("user_id", session.user.id)
    }

    return NextResponse.json({ htmlContent, textContent })
  } catch (error: any) {
    console.error("Error fetching email content:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
