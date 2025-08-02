import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { google } from "googleapis"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Helper to refresh Google access token
async function refreshGoogleAccessToken(refreshToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials.access_token
  } catch (error) {
    console.error("Error refreshing Google access token:", error)
    return null
  }
}

// Function to categorize email content using AI
async function categorizeEmailWithAI(emailContent: string, userId: string): Promise<string | null> {
  try {
    // Fetch user's custom categories
    const { data: userCategories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)

    if (categoriesError) {
      console.error("Error fetching user categories for AI:", categoriesError)
      return null
    }

    const categoryNames = userCategories.map((cat) => cat.name).join(", ")
    const uncategorizedId = userCategories.find((cat) => cat.name === "Uncategorized")?.id || null

    const prompt = `Categorize the following email content into one of these categories: ${categoryNames}. If none of the categories fit, categorize it as "Uncategorized". Only respond with the category name.

Email content:
---
${emailContent}
---

Category:`

    const { text: categoryName } = await generateText({
      model: groq("llama3-8b-8192"), // Using Groq's Llama 3 8B model
      prompt: prompt,
      temperature: 0, // Keep it deterministic for categorization
    })

    const foundCategory = userCategories.find((cat) => cat.name.toLowerCase() === categoryName.trim().toLowerCase())

    return foundCategory ? foundCategory.id : uncategorizedId
  } catch (error) {
    console.error("Error categorizing email with AI:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { accountId, maxResults = 50 } = await request.json()

    if (!accountId) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
    }

    // Fetch account details
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("access_token, refresh_token, expires_at, email")
      .eq("id", accountId)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      console.error("Error fetching account:", accountError)
      return NextResponse.json({ error: "Account not found or unauthorized" }, { status: 404 })
    }

    let currentAccessToken = account.access_token
    // Check if token is expired or about to expire (e.g., within 5 minutes)
    const expiresAtDate = new Date(account.expires_at)
    if (expiresAtDate.getTime() < Date.now() + 5 * 60 * 1000) {
      console.log(`Refreshing token for account: ${account.email}`)
      const newAccessToken = await refreshGoogleAccessToken(account.refresh_token!)
      if (newAccessToken) {
        currentAccessToken = newAccessToken
        // Update the access token in Supabase
        await supabase
          .from("user_accounts")
          .update({ access_token: newAccessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }) // Assuming 1 hour validity
          .eq("id", accountId)
      } else {
        console.error(`Failed to refresh token for account: ${account.email}. Skipping import.`)
        return NextResponse.json({ error: "Failed to refresh access token" }, { status: 500 })
      }
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: currentAccessToken })
    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: maxResults,
    })

    const messages = listResponse.data.messages || []
    const importedEmails = []

    for (const msg of messages) {
      try {
        const getResponse = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "full",
        })
        const emailData = getResponse.data

        const headers = emailData.payload?.headers || []
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
        const senderHeader = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
        const senderMatch = senderHeader.match(/^(.*?) <(.*?)>$/)
        const sender = senderMatch ? senderMatch[1].trim() : senderHeader.split("<")[0].trim()
        const senderEmail = senderMatch
          ? senderMatch[2]
          : senderHeader.includes("<")
            ? senderHeader.split("<")[1].replace(">", "")
            : senderHeader.trim()
        const dateHeader = headers.find((h) => h.name === "Date")?.value
        const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString()
        const snippet = emailData.snippet || ""
        const isRead = !emailData.labelIds?.includes("UNREAD")

        // Extract body content (plain text or HTML)
        let bodyContent = ""
        if (emailData.payload?.parts) {
          const part = emailData.payload.parts.find((p) => p.mimeType === "text/plain" || p.mimeType === "text/html")
          if (part?.body?.data) {
            bodyContent = Buffer.from(part.body.data, "base64").toString("utf8")
          }
        } else if (emailData.payload?.body?.data) {
          bodyContent = Buffer.from(emailData.payload.body.data, "base64").toString("utf8")
        }

        // Categorize with AI
        const category_id = await categorizeEmailWithAI(
          subject + " " + snippet + " " + bodyContent.substring(0, 500),
          session.user.id,
        )

        const { data: insertedEmail, error: insertError } = await supabase
          .from("emails")
          .upsert(
            {
              id: emailData.id!,
              user_id: session.user.id,
              account_id: accountId,
              thread_id: emailData.threadId!,
              subject,
              sender,
              sender_email: senderEmail,
              snippet,
              received_at: receivedAt,
              is_read: isRead,
              category_id: category_id,
              full_content: bodyContent, // Store full content
            },
            { onConflict: "id" },
          )
          .select()
          .single()

        if (insertError) {
          console.error(`Error upserting email ${emailData.id}:`, insertError)
        } else if (insertedEmail) {
          importedEmails.push(insertedEmail)
        }
      } catch (emailFetchError) {
        console.error(`Error fetching or processing email ${msg.id}:`, emailFetchError)
      }
    }

    // Update last_sync_history_id for the account after initial import
    if (listResponse.data.historyId) {
      await supabase
        .from("user_accounts")
        .update({ last_sync_history_id: listResponse.data.historyId })
        .eq("id", accountId)
    }

    return NextResponse.json({ success: true, importedCount: importedEmails.length, importedEmails })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
