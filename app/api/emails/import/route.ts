import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { google } from "googleapis"

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

    const { accountId, startDate, endDate } = await request.json()

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

    // Create a processing job
    const { data: job, error: jobError } = await supabase
      .from("email_processing_jobs")
      .insert({
        user_id: session.user.id,
        status: "processing",
        emails_processed: 0,
        total_emails: 0,
      })
      .select()
      .single()

    if (jobError) {
      console.error("Error creating processing job:", jobError)
      return NextResponse.json({ error: "Failed to create processing job" }, { status: 500 })
    }

    // Start the import process (this would typically be done in a background job)
    try {
      await importEmailsFromGmail(account, session.user.id, job.id, startDate, endDate)
    } catch (importError) {
      console.error("Import error:", importError)

      // Update job status to failed
      await supabase
        .from("email_processing_jobs")
        .update({
          status: "failed",
          error_message: importError instanceof Error ? importError.message : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)

      return NextResponse.json({ error: "Import failed" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Import started successfully",
      jobId: job.id,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function importEmailsFromGmail(
  account: any,
  userId: string,
  jobId: string,
  startDate?: string,
  endDate?: string,
) {
  const gmail = await getGmailClient(account.access_token)

  // Build query with date filters if provided
  let query = "in:inbox"
  if (startDate) {
    query += ` after:${new Date(startDate).toISOString().split("T")[0]}`
  }
  if (endDate) {
    query += ` before:${new Date(endDate).toISOString().split("T")[0]}`
  }

  // Get list of messages
  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 500,
  })

  const messages = response.data.messages || []

  // Update job with total count
  await supabase
    .from("email_processing_jobs")
    .update({
      total_emails: messages.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)

  let processed = 0

  for (const message of messages) {
    try {
      // Get full message details
      const fullMessage = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      })

      const headers = fullMessage.data.payload?.headers || []
      const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
      const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
      const date = headers.find((h) => h.name === "Date")?.value

      // Extract email body
      const emailBody = extractEmailBody(fullMessage.data.payload)

      // Check if email already exists
      const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", message.id!).single()

      if (!existingEmail) {
        // Get or create "Uncategorized" category
        const { data: uncategorizedCategory } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", userId)
          .eq("name", "Uncategorized")
          .single()

        let categoryId = uncategorizedCategory?.id

        if (!categoryId) {
          const { data: newCategory } = await supabase
            .from("categories")
            .insert({
              user_id: userId,
              name: "Uncategorized",
              description: "Emails that haven't been categorized yet",
              color: "#6B7280",
            })
            .select("id")
            .single()

          categoryId = newCategory?.id
        }

        // Insert the email
        await supabase.from("emails").insert({
          id: message.id!,
          user_id: userId,
          account_id: account.id,
          category_id: categoryId,
          subject,
          sender: from,
          snippet: fullMessage.data.snippet || "",
          email_body: emailBody,
          received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
          gmail_thread_id: fullMessage.data.threadId,
        })
      }

      processed++

      // Update progress every 10 emails
      if (processed % 10 === 0) {
        await supabase
          .from("email_processing_jobs")
          .update({
            emails_processed: processed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId)
      }
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error)
    }
  }

  // Mark job as completed
  await supabase
    .from("email_processing_jobs")
    .update({
      status: "completed",
      emails_processed: processed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)

  // Update account last sync
  await supabase
    .from("user_accounts")
    .update({
      last_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
}

function extractEmailBody(payload: any): string {
  if (!payload) return ""

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8")
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8")
      }
    }

    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8")
      }
    }
  }

  return ""
}

async function getGmailClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  return google.gmail({ version: "v1", auth: oauth2Client })
}
