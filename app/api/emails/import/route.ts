import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { groq } from "@ai-sdk/groq"
import { generateText } from "ai"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface GmailMessage {
  id: string
  threadId: string
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

    // Get the user account
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Determine the date to fetch emails from
    let afterDate: string
    if (account.last_sync) {
      // Fetch emails since last sync
      afterDate = new Date(account.last_sync).toISOString().split("T")[0].replace(/-/g, "/")
    } else {
      // First time sync - fetch emails from account creation date
      afterDate = new Date(account.created_at).toISOString().split("T")[0].replace(/-/g, "/")
    }

    // Fetch emails from Gmail API
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${afterDate}&maxResults=50`,
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
    const messageIds = gmailData.messages || []

    if (messageIds.length === 0) {
      // Update last sync time even if no new emails
      await supabase.from("user_accounts").update({ last_sync: new Date().toISOString() }).eq("id", accountId)

      return NextResponse.json({
        success: true,
        message: "No new emails to import",
        imported: 0,
      })
    }

    let importedCount = 0
    const errors: string[] = []

    // Process each email
    for (const messageRef of messageIds.slice(0, 20)) {
      // Limit to 20 emails per import
      try {
        // Check if email already exists
        const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", messageRef.id).single()

        if (existingEmail) {
          continue // Skip if already imported
        }

        // Fetch full email details
        const emailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`, {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
          },
        })

        if (!emailResponse.ok) {
          errors.push(`Failed to fetch email ${messageRef.id}`)
          continue
        }

        const emailData: GmailMessage = await emailResponse.json()

        // Extract email details
        const headers = emailData.payload.headers
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
        const sender = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
        const receivedAt = new Date(Number.parseInt(emailData.internalDate))

        // Extract email body
        let emailBody = ""
        if (emailData.payload.body?.data) {
          emailBody = Buffer.from(emailData.payload.body.data, "base64").toString("utf-8")
        } else if (emailData.payload.parts) {
          for (const part of emailData.payload.parts) {
            if (part.body?.data && part.mimeType?.includes("text")) {
              emailBody += Buffer.from(part.body.data, "base64").toString("utf-8")
            }
          }
        }

        // Clean up email body (remove HTML tags for AI processing)
        const cleanBody = emailBody
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim()

        // Generate AI summary and category
        let aiSummary = ""
        let categoryId = null

        try {
          if (process.env.GROQ_API_KEY && cleanBody) {
            const { text } = await generateText({
              model: groq("llama-3.1-8b-instant"),
              prompt: `Summarize this email in 1-2 sentences, focusing on the main purpose and any action items:

Subject: ${subject}
From: ${sender}
Content: ${cleanBody.substring(0, 1000)}...

Summary:`,
              maxTokens: 100,
            })
            aiSummary = text.trim()
          }

          // Get user's categories for auto-categorization
          const { data: categories } = await supabase
            .from("categories")
            .select("id, name")
            .eq("user_id", session.user.id)

          if (categories && categories.length > 0 && cleanBody) {
            const categoryNames = categories.map((c) => c.name).join(", ")
            const { text: categoryText } = await generateText({
              model: groq("llama-3.1-8b-instant"),
              prompt: `Categorize this email into one of these categories: ${categoryNames}

Subject: ${subject}
From: ${sender}
Content: ${cleanBody.substring(0, 500)}...

Return only the category name that best fits this email:`,
              maxTokens: 20,
            })

            const suggestedCategory = categories.find((c) => categoryText.toLowerCase().includes(c.name.toLowerCase()))
            if (suggestedCategory) {
              categoryId = suggestedCategory.id
            }
          }
        } catch (aiError) {
          console.error("AI processing error:", aiError)
          // Continue without AI features if they fail
        }

        // Insert email into database
        const { error: insertError } = await supabase.from("emails").insert({
          id: emailData.id,
          user_id: session.user.id,
          account_id: accountId,
          category_id: categoryId,
          subject,
          sender,
          snippet: emailData.snippet,
          ai_summary: aiSummary,
          email_body: emailBody,
          received_at: receivedAt.toISOString(),
          is_read: false,
          gmail_thread_id: emailData.threadId,
        })

        if (insertError) {
          console.error("Error inserting email:", insertError)
          errors.push(`Failed to save email: ${subject}`)
          continue
        }

        // Archive the email in Gmail (remove from inbox but don't delete)
        try {
          await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}/modify`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              removeLabelIds: ["INBOX"],
            }),
          })
        } catch (archiveError) {
          console.error("Failed to archive email:", archiveError)
          // Don't fail the import if archiving fails
        }

        importedCount++
      } catch (emailError) {
        console.error(`Error processing email ${messageRef.id}:`, emailError)
        errors.push(`Error processing email ${messageRef.id}`)
      }
    }

    // Update last sync time
    await supabase.from("user_accounts").update({ last_sync: new Date().toISOString() }).eq("id", accountId)

    return NextResponse.json({
      success: true,
      imported: importedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${importedCount} emails${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import emails" }, { status: 500 })
  }
}
