import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>
  }
  internalDate: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

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

    // Get user categories for AI categorization
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", session.user.id)

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=in:inbox -in:sent&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      },
    )

    if (!gmailResponse.ok) {
      console.error("Gmail API error:", await gmailResponse.text())
      return NextResponse.json({ error: "Failed to fetch emails from Gmail" }, { status: 500 })
    }

    const gmailData = await gmailResponse.json()
    const messageIds = gmailData.messages || []

    let importedCount = 0
    let processedCount = 0

    for (const messageRef of messageIds) {
      try {
        processedCount++

        // Check if email already exists
        const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", messageRef.id).single()

        if (existingEmail) {
          continue // Skip if already imported
        }

        // Fetch full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          },
        )

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${messageRef.id}`)
          continue
        }

        const message: GmailMessage = await messageResponse.json()

        // Extract email details
        const headers = message.payload.headers
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
        const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
        const date = new Date(Number.parseInt(message.internalDate))

        // Extract email body
        const emailBody = extractEmailBody(message.payload)

        // Generate AI summary
        const aiSummary = await generateEmailSummary(subject, from, emailBody)

        // Categorize email with AI
        const categoryId = await categorizeEmailWithAI(subject, from, emailBody, categories)

        // Store email in database
        const { error: insertError } = await supabase.from("emails").insert({
          id: message.id,
          user_id: session.user.id,
          account_id: accountId,
          category_id: categoryId,
          subject,
          sender: from,
          snippet: message.snippet,
          ai_summary: aiSummary,
          received_at: date.toISOString(),
          is_read: !message.labelIds.includes("UNREAD"),
          gmail_thread_id: message.threadId,
          email_body: emailBody, // Store full email content
        })

        if (insertError) {
          console.error("Error inserting email:", insertError)
          continue
        }

        // Archive email in Gmail
        await archiveEmailInGmail(message.id, account.access_token)

        importedCount++
      } catch (error) {
        console.error(`Error processing message ${messageRef.id}:`, error)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      processed: processedCount,
      message: `Successfully imported ${importedCount} new emails out of ${processedCount} processed`,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import emails" }, { status: 500 })
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

async function generateEmailSummary(subject: string, from: string, body: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Summarize this email in 1-2 sentences. Focus on the main purpose and any action items.

Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 2000)}...`,
      maxTokens: 100,
    })

    return text
  } catch (error) {
    console.error("Error generating summary:", error)
    return "Unable to generate summary"
  }
}

async function categorizeEmailWithAI(
  subject: string,
  from: string,
  body: string,
  categories: any[],
): Promise<string | null> {
  if (!categories.length) return null

  try {
    const categoryList = categories.map((cat) => `${cat.name}: ${cat.description}`).join("\n")

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Categorize this email into one of the following categories. Respond with only the category name.

Categories:
${categoryList}

Email:
Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 1000)}...

Category:`,
      maxTokens: 50,
    })

    const selectedCategory = categories.find((cat) => cat.name.toLowerCase() === text.trim().toLowerCase())

    return selectedCategory?.id || null
  } catch (error) {
    console.error("Error categorizing email:", error)
    return null
  }
}

async function archiveEmailInGmail(messageId: string, accessToken: string): Promise<void> {
  try {
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        removeLabelIds: ["INBOX"],
      }),
    })
  } catch (error) {
    console.error("Error archiving email:", error)
  }
}
