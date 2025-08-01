import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    parts?: Array<{
      mimeType: string
      body: { data?: string }
      parts?: Array<{
        mimeType: string
        body: { data?: string }
      }>
    }>
    body?: { data?: string }
  }
  internalDate: string
}

function extractEmailBody(payload: any): string {
  let body = ""

  // Check if there's a direct body
  if (payload.body?.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8")
  }

  // Check parts for multipart messages
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8")
        break
      }
      if (part.mimeType === "text/html" && part.body?.data && !body) {
        body = Buffer.from(part.body.data, "base64").toString("utf-8")
      }
      // Handle nested parts
      if (part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === "text/plain" && nestedPart.body?.data) {
            body = Buffer.from(nestedPart.body.data, "base64").toString("utf-8")
            break
          }
        }
      }
    }
  }

  // Clean up HTML tags if it's HTML content
  if (body.includes("<html>") || body.includes("<body>")) {
    body = body
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  return body || "No content available"
}

async function categorizeEmail(subject: string, sender: string, body: string, categories: any[]) {
  try {
    const categoryNames = categories.map((cat) => cat.name).join(", ")

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Categorize this email into one of these categories: ${categoryNames}

Email Details:
Subject: ${subject}
From: ${sender}
Body: ${body.substring(0, 500)}...

Respond with only the category name that best fits this email. If none fit perfectly, choose the closest match.`,
    })

    const suggestedCategory = text.trim()
    const matchedCategory = categories.find((cat) => cat.name.toLowerCase() === suggestedCategory.toLowerCase())

    return matchedCategory?.id || null
  } catch (error) {
    console.error("Error categorizing email:", error)
    return null
  }
}

async function summarizeEmail(subject: string, body: string) {
  try {
    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Summarize this email in 1-2 concise sentences:

Subject: ${subject}
Body: ${body.substring(0, 1000)}...

Provide a brief, helpful summary that captures the main point and any action items.`,
    })

    return text.trim()
  } catch (error) {
    console.error("Error summarizing email:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId } = await request.json()

    // Get the account details
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Get user categories
    const { data: categories } = await supabase.from("categories").select("*").eq("user_id", session.user.id)

    // Determine the date to fetch emails from
    let afterDate = ""
    if (account.last_sync) {
      // Fetch emails since last sync
      const lastSyncDate = new Date(account.last_sync)
      afterDate = `after:${lastSyncDate.getFullYear()}/${(lastSyncDate.getMonth() + 1).toString().padStart(2, "0")}/${lastSyncDate.getDate().toString().padStart(2, "0")}`
    } else {
      // First time sync - fetch emails from account creation date
      const createdDate = new Date(account.created_at)
      afterDate = `after:${createdDate.getFullYear()}/${(createdDate.getMonth() + 1).toString().padStart(2, "0")}/${createdDate.getDate().toString().padStart(2, "0")}`
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox ${afterDate}&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      },
    )

    if (!gmailResponse.ok) {
      throw new Error(`Gmail API error: ${gmailResponse.statusText}`)
    }

    const gmailData = await gmailResponse.json()
    const messages = gmailData.messages || []

    let processedCount = 0
    let newEmailsCount = 0

    for (const message of messages) {
      try {
        // Check if email already exists
        const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", message.id).single()

        if (existingEmail) {
          continue // Skip if already imported
        }

        // Fetch full message details
        const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`, {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        })

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}`)
          continue
        }

        const messageData: GmailMessage = await messageResponse.json()

        // Extract email details
        const headers = messageData.payload.headers
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
        const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
        const receivedAt = new Date(Number.parseInt(messageData.internalDate))
        const emailBody = extractEmailBody(messageData.payload)

        // Categorize and summarize email
        const categoryId = categories?.length ? await categorizeEmail(subject, from, emailBody, categories) : null
        const aiSummary = await summarizeEmail(subject, emailBody)

        // Insert email into database
        const { error: insertError } = await supabase.from("emails").insert({
          id: messageData.id,
          user_id: session.user.id,
          account_id: accountId,
          category_id: categoryId,
          subject,
          sender: from,
          snippet: messageData.snippet,
          ai_summary: aiSummary,
          email_body: emailBody,
          received_at: receivedAt.toISOString(),
          gmail_thread_id: messageData.threadId,
          is_read: false,
          is_archived: false,
        })

        if (insertError) {
          console.error("Error inserting email:", insertError)
          continue
        }

        // Archive the email in Gmail (remove from inbox)
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}/modify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            removeLabelIds: ["INBOX"],
          }),
        })

        newEmailsCount++
        processedCount++
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
        continue
      }
    }

    // Update last sync timestamp
    await supabase
      .from("user_accounts")
      .update({
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)

    return NextResponse.json({
      success: true,
      processed: processedCount,
      newEmails: newEmailsCount,
      total: messages.length,
    })
  } catch (error) {
    console.error("Email import error:", error)
    return NextResponse.json({ error: "Failed to import emails" }, { status: 500 })
  }
}
