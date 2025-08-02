import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { google } from "googleapis"
import { UnsubscribeAgent } from "@/lib/server/unsubscribe-agent"

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

  const results = []
  let processedCount = 0
  let successfulUnsubscribes = 0

  for (const emailId of emailIds) {
    let emailSubject = "Unknown Subject"
    let emailSender = "Unknown Sender"
    try {
      // 1. Fetch email details from your database
      const { data: email, error: emailError } = await supabase
        .from("emails")
        .select("message_id, account_id, subject, sender")
        .eq("id", emailId)
        .eq("user_id", session.user.id)
        .single()

      if (emailError || !email) {
        results.push({
          emailId,
          subject: emailSubject,
          sender: emailSender,
          success: false,
          summary: `Email not found or unauthorized: ${emailError?.message}`,
          details: [],
        })
        continue
      }

      emailSubject = email.subject
      emailSender = email.sender
      processedCount++

      // 2. Fetch account details to get Gmail tokens
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("access_token, refresh_token, expires_at, email")
        .eq("id", email.account_id)
        .eq("user_id", session.user.id)
        .single()

      if (accountError || !account) {
        results.push({
          emailId,
          subject: emailSubject,
          sender: emailSender,
          success: false,
          summary: `Account not found or unauthorized: ${accountError?.message}`,
          details: [],
        })
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

      // 3. Fetch the full email content from Gmail
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
        if (payload.mimeType === "text/html") {
          htmlContent = getPartContent(payload)
        } else if (payload.mimeType === "text/plain") {
          textContent = getPartContent(payload)
        }
      }

      const unsubscribeAgent = new UnsubscribeAgent(gmail, account.email, email.message_id, email.subject, email.sender)
      const unsubscribeResult = await unsubscribeAgent.attemptUnsubscribe(htmlContent, textContent)

      if (unsubscribeResult.success) {
        successfulUnsubscribes++
        // Move email to trash after successful unsubscribe
        await gmail.users.messages.trash({
          userId: "me",
          id: email.message_id,
        })
        // Optionally, delete from your DB as well
        await supabase.from("emails").delete().eq("id", emailId)
      }

      results.push({
        emailId,
        subject: emailSubject,
        sender: emailSender,
        success: unsubscribeResult.success,
        summary: unsubscribeResult.summary,
        details: unsubscribeResult.details,
      })
    } catch (overallError: any) {
      console.error(`Error processing unsubscribe for email ${emailId}:`, overallError)
      results.push({
        emailId,
        subject: emailSubject,
        sender: emailSender,
        success: false,
        summary: `An unexpected error occurred: ${overallError.message}`,
        details: [],
      })
    }
  }

  return NextResponse.json({ processed: processedCount, successful: successfulUnsubscribes, results })
}
