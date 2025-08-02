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

    const { accountId, dateFrom, dateTo, isScheduled = false } = await request.json()

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

    // Ensure uncategorized category exists
    const { data: uncategorizedId, error: uncategorizedError } = await supabase.rpc("ensure_uncategorized_category", {
      p_user_id: session.user.id,
    })

    if (uncategorizedError) {
      console.error("Error ensuring uncategorized category:", uncategorizedError)
      return NextResponse.json({ error: "Failed to ensure uncategorized category" }, { status: 500 })
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

    // Build date query for Gmail API
    const dateQuery = buildGmailDateQuery(dateFrom, dateTo, account, isScheduled)

    // Fetch emails from Gmail API with date filtering
    const gmailQuery = `in:inbox -in:sent ${dateQuery}`
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=100`,
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

        // Extract sender email
        const senderEmail = extractSenderEmail(from)

        // Extract email body
        const emailBody = extractEmailBody(message.payload)

        // Generate AI summary using Groq
        const aiSummary = await generateEmailSummary(subject, from, emailBody)

        // Store email in database
        const { data: insertedEmail, error: insertError } = await supabase
          .from("emails")
          .insert({
            id: message.id,
            user_id: session.user.id,
            account_id: accountId,
            subject,
            sender: from,
            sender_email: senderEmail,
            snippet: message.snippet,
            ai_summary: aiSummary,
            received_at: date.toISOString(),
            is_read: !message.labelIds.includes("UNREAD"),
            gmail_thread_id: message.threadId,
            email_body: emailBody,
          })
          .select()
          .single()

        if (insertError) {
          console.error("Error inserting email:", insertError)
          continue
        }

        // Categorize email with AI
        const suggestedCategories = await categorizeEmailWithAI(subject, from, emailBody, categories || [])

        // Add categories to email
        if (suggestedCategories.length > 0) {
          const categoryInserts = suggestedCategories.map((cat) => ({
            email_id: message.id,
            category_id: cat.categoryId,
            is_ai_suggested: true,
            confidence_score: cat.confidence,
          }))

          await supabase.from("email_categories").insert(categoryInserts)
        } else {
          // Add to uncategorized if no categories found
          await supabase.from("email_categories").insert({
            email_id: message.id,
            category_id: uncategorizedId,
            is_ai_suggested: false,
            confidence_score: null,
          })
        }

        // Archive email in Gmail
        await archiveEmailInGmail(message.id, account.access_token)

        importedCount++
      } catch (error) {
        console.error(`Error processing message ${messageRef.id}:`, error)
        continue
      }
    }

    // Update last sync time for the account
    await supabase
      .from("user_accounts")
      .update({
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)

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

function buildGmailDateQuery(
  dateFrom: string | null,
  dateTo: string | null,
  account: any,
  isScheduled: boolean,
): string {
  if (dateFrom && dateTo) {
    // Use provided date range
    const fromDate = new Date(dateFrom).toISOString().split("T")[0].replace(/-/g, "/")
    const toDate = new Date(dateTo).toISOString().split("T")[0].replace(/-/g, "/")
    return `after:${fromDate} before:${toDate}`
  }

  if (isScheduled && account.last_sync) {
    // For scheduled imports, get emails after last sync
    const afterDate = new Date(account.last_sync).toISOString().split("T")[0].replace(/-/g, "/")
    return `after:${afterDate}`
  }

  if (!isScheduled) {
    // For manual imports without date range, get emails from account creation
    const afterDate = new Date(account.created_at).toISOString().split("T")[0].replace(/-/g, "/")
    return `after:${afterDate}`
  }

  return ""
}

function extractSenderEmail(sender: string): string {
  const match = sender.match(/<([^>]+)>/)
  return match ? match[1] : sender
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
      model: groq("llama-3.1-8b-instant"),
      prompt: `Summarize this email in 1-2 sentences. Focus on the main purpose and any action items.

Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 2000)}...

Summary:`,
      maxTokens: 100,
    })

    return text.trim()
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
): Promise<Array<{ categoryId: string; confidence: number }>> {
  if (!categories.length) return []

  try {
    const categoryList = categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `You are an email categorization assistant. Analyze the email and choose the most appropriate category from the list below. You can suggest multiple categories if relevant. Respond with ONLY the category names separated by commas, nothing else.

Available Categories:
${categoryList}

Email to categorize:
Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 1000)}...

Categories:`,
      maxTokens: 50,
    })

    const suggestedCategoryNames = text
      .trim()
      .split(",")
      .map((name) => name.trim())
    const results: Array<{ categoryId: string; confidence: number }> = []

    for (const categoryName of suggestedCategoryNames) {
      const matchedCategory = categories.find(
        (cat) =>
          cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
          categoryName.toLowerCase().includes(cat.name.toLowerCase()),
      )

      if (matchedCategory) {
        results.push({
          categoryId: matchedCategory.id,
          confidence: 0.8, // Default confidence score
        })
      }
    }

    return results
  } catch (error) {
    console.error("Error categorizing email:", error)
    return []
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
