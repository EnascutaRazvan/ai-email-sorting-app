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

    const { accountId, isScheduled = false, dateFrom, dateTo } = await request.json()

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

    // Check if auto-sync is enabled for this user
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("auto_sync_enabled")
      .eq("user_id", session.user.id)
      .single()

    if (isScheduled && userSettings && !userSettings.auto_sync_enabled) {
      return NextResponse.json({
        success: true,
        message: "Auto-sync is disabled for this user",
        imported: 0,
        processed: 0,
      })
    }

    // Ensure uncategorized category exists
    await ensureUncategorizedCategory(session.user.id)

    // Get user categories for AI categorization
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", session.user.id)

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    // Build date query based on custom range or default logic
    const dateQuery = await buildDateQuery(accountId, session.user.id, isScheduled, dateFrom, dateTo)

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

        // Extract email body
        const emailBody = extractEmailBody(message.payload)

        // Generate AI summary using Groq
        const aiSummary = await generateEmailSummary(subject, from, emailBody)

        // Categorize email with AI using Groq
        const categoryResult = await categorizeEmailWithAI(subject, from, emailBody, categories)

        // Store email in database
        const { error: insertError } = await supabase.from("emails").insert({
          id: message.id,
          user_id: session.user.id,
          account_id: accountId,
          category_id: categoryResult.categoryId,
          suggested_category_id: categoryResult.suggestedCategoryId,
          subject,
          sender: from,
          snippet: message.snippet,
          ai_summary: aiSummary,
          received_at: date.toISOString(),
          is_read: !message.labelIds.includes("UNREAD"),
          gmail_thread_id: message.threadId,
          email_body: emailBody,
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

async function ensureUncategorizedCategory(userId: string) {
  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Uncategorized")
    .single()

  if (!existingCategory) {
    await supabase.from("categories").insert({
      user_id: userId,
      name: "Uncategorized",
      description: "Emails that haven't been categorized yet",
      color: "#6B7280",
    })
  }
}

async function buildDateQuery(
  accountId: string,
  userId: string,
  isScheduled: boolean,
  customDateFrom?: string,
  customDateTo?: string,
): Promise<string> {
  try {
    // If custom date range is provided, use it
    if (customDateFrom || customDateTo) {
      let query = ""
      if (customDateFrom) {
        const fromDate = new Date(customDateFrom).toISOString().split("T")[0].replace(/-/g, "/")
        query += `after:${fromDate}`
      }
      if (customDateTo) {
        const toDate = new Date(customDateTo).toISOString().split("T")[0].replace(/-/g, "/")
        query += query ? ` before:${toDate}` : `before:${toDate}`
      }
      return query
    }

    // Get the account's last sync time and creation time
    const { data: account } = await supabase
      .from("user_accounts")
      .select("last_sync, created_at")
      .eq("id", accountId)
      .single()

    if (!account) {
      return "" // No date filter if account not found
    }

    let afterDate: Date

    if (isScheduled && account.last_sync) {
      // For scheduled imports, get emails after last sync
      afterDate = new Date(account.last_sync)
    } else {
      // For manual imports or first-time imports, get emails from account creation
      afterDate = new Date(account.created_at)
    }

    // Format date for Gmail API (YYYY/MM/DD)
    const formattedDate = afterDate.toISOString().split("T")[0].replace(/-/g, "/")

    return `after:${formattedDate}`
  } catch (error) {
    console.error("Error building date query:", error)
    return ""
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
): Promise<{ categoryId: string | null; suggestedCategoryId: string | null }> {
  if (!categories.length) {
    return { categoryId: null, suggestedCategoryId: null }
  }

  try {
    const categoryList = categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `You are an email categorization assistant. Analyze the email and choose the most appropriate category from the list below. Respond with ONLY the category name, nothing else.

Available Categories:
${categoryList}

Email to categorize:
Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 1000)}...

Category:`,
      maxTokens: 20,
    })

    const selectedCategory = categories.find(
      (cat) =>
        cat.name.toLowerCase().includes(text.trim().toLowerCase()) ||
        text.trim().toLowerCase().includes(cat.name.toLowerCase()),
    )

    if (selectedCategory) {
      // High confidence match - assign directly
      return { categoryId: selectedCategory.id, suggestedCategoryId: null }
    } else {
      // No clear match - find uncategorized and suggest best match
      const uncategorizedCategory = categories.find((cat) => cat.name === "Uncategorized")
      const bestGuess = categories[0] // Could implement more sophisticated logic here

      return {
        categoryId: uncategorizedCategory?.id || null,
        suggestedCategoryId: bestGuess?.id || null,
      }
    }
  } catch (error) {
    console.error("Error categorizing email:", error)
    const uncategorizedCategory = categories.find((cat) => cat.name === "Uncategorized")
    return { categoryId: uncategorizedCategory?.id || null, suggestedCategoryId: null }
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
