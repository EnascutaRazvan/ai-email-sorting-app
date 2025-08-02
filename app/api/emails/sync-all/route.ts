import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"
import { google } from "googleapis"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const userId = session.user.id

  try {
    // Fetch all accounts for the current user that have connected Gmail
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google")

    if (accountsError) {
      console.error("Error fetching accounts for sync:", accountsError)
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    let totalEmailsSynced = 0
    let totalEmailsCategorized = 0

    // Ensure 'Uncategorized' category exists for the user
    const { data: uncategorizedData, error: uncategorizedError } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "Uncategorized")
      .single()

    let uncategorizedCategoryId = uncategorizedData?.id
    if (uncategorizedError || !uncategorizedCategoryId) {
      // If 'Uncategorized' doesn't exist, create it
      const { data: newCategory, error: createCategoryError } = await supabase
        .from("categories")
        .insert({ user_id: userId, name: "Uncategorized", color: "#9CA3AF" })
        .select()
        .single()
      if (createCategoryError || !newCategory) {
        console.error("Failed to create Uncategorized category during sync:", createCategoryError)
        return NextResponse.json({ error: "Failed to ensure Uncategorized category" }, { status: 500 })
      }
      uncategorizedCategoryId = newCategory.id
    }

    for (const account of accounts) {
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
          .eq("id", account.id)
        oauth2Client.setCredentials(credentials)
      }

      const gmail = google.gmail({ version: "v1", auth: oauth2Client })

      // Fetch emails
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 50, // Limit to 50 emails per sync for performance
        q: "in:inbox", // Only fetch emails in the inbox
      })

      const messages = response.data.messages || []
      const emailsToProcess = []

      for (const message of messages) {
        const { data: existingEmail } = await supabase
          .from("emails")
          .select("id")
          .eq("message_id", message.id)
          .eq("account_id", account.id)
          .single()

        if (!existingEmail) {
          emailsToProcess.push(message.id)
        }
      }

      for (const messageId of emailsToProcess) {
        try {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          })

          const headers = msg.data.payload?.headers || []
          const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
          const sender = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
          const receivedAt = headers.find((h) => h.name === "Date")?.value || new Date().toISOString()

          // Extract snippet (body preview)
          const snippet = msg.data.snippet || ""

          // Extract full content (for AI processing)
          let fullContent = ""
          if (msg.data.payload?.parts) {
            const part = msg.data.payload.parts.find((p) => p.mimeType === "text/plain" || p.mimeType === "text/html")
            if (part?.body?.data) {
              fullContent = Buffer.from(part.body.data, "base64").toString("utf8")
            }
          } else if (msg.data.payload?.body?.data) {
            fullContent = Buffer.from(msg.data.payload.body.data, "base64").toString("utf8")
          }

          // AI Categorization and Summary
          let aiSummary = ""
          let suggestedCategoryName = "Uncategorized"
          let suggestedCategoryId = uncategorizedCategoryId

          try {
            const { text: aiResponse } = await generateText({
              model: openai("gpt-4o"), // Using OpenAI for categorization and summary
              prompt: `Analyze the following email and provide a concise summary (max 50 words) and suggest a single category from the following list: Work, Personal, Promotions, Social, Updates, Forums, Purchases, Finance, Travel, Health, Education, Newsletters, Spam, Uncategorized. If none fit well, use 'Uncategorized'.
              
              Email Subject: ${subject}
              Email Sender: ${sender}
              Email Snippet: ${snippet}
              Email Content (first 500 chars): ${fullContent.substring(0, 500)}
              
              Format your response as a JSON object with 'summary' and 'category' fields. Example: {"summary": "...", "category": "Work"}`,
            })

            const parsedAiResponse = JSON.parse(aiResponse)
            aiSummary = parsedAiResponse.summary || ""
            suggestedCategoryName = parsedAiResponse.category || "Uncategorized"

            // Fetch or create the suggested category
            const { data: categoryData, error: categoryError } = await supabase
              .from("categories")
              .select("*")
              .eq("user_id", userId)
              .eq("name", suggestedCategoryName)
              .single()

            if (categoryError && categoryError.code === "PGRST116") {
              // Category not found, create it
              const defaultColors: { [key: string]: string } = {
                Work: "#10B981", // Emerald
                Personal: "#6366F1", // Indigo
                Promotions: "#F59E0B", // Amber
                Social: "#EF4444", // Red
                Updates: "#3B82F6", // Blue
                Forums: "#8B5CF6", // Violet
                Purchases: "#EC4899", // Pink
                Finance: "#06B6D4", // Cyan
                Travel: "#A855F7", // Purple
                Health: "#14B8A6", // Teal
                Education: "#F97316", // Orange
                Newsletters: "#6B7280", // Gray
                Spam: "#DC2626", // Red-dark
                Uncategorized: "#9CA3AF", // Gray
              }
              const newColor = defaultColors[suggestedCategoryName] || "#9CA3AF"

              const { data: newCategory, error: newCategoryError } = await supabase
                .from("categories")
                .insert({
                  user_id: userId,
                  name: suggestedCategoryName,
                  color: newColor,
                })
                .select()
                .single()

              if (newCategoryError) {
                console.error("Error creating new category during sync:", newCategoryError)
                suggestedCategoryId = uncategorizedCategoryId
              } else {
                suggestedCategoryId = newCategory.id
              }
            } else if (categoryError) {
              console.error("Error fetching category during sync:", categoryError)
              suggestedCategoryId = uncategorizedCategoryId
            } else {
              suggestedCategoryId = categoryData.id
            }
          } catch (aiError) {
            console.error("AI categorization/summary failed during sync:", aiError)
            suggestedCategoryId = uncategorizedCategoryId
          }

          const { error: insertEmailError } = await supabase.from("emails").insert({
            user_id: userId,
            account_id: account.id,
            message_id: msg.data.id,
            thread_id: msg.data.threadId,
            subject: subject,
            sender: sender,
            snippet: snippet,
            received_at: new Date(receivedAt).toISOString(),
            is_read: msg.data.labelIds?.includes("UNREAD") ? false : true,
            ai_summary: aiSummary,
            category_id: suggestedCategoryId,
            suggested_category_id: suggestedCategoryId,
          })

          if (insertEmailError) {
            console.error("Error inserting email:", insertEmailError)
          } else {
            totalEmailsSynced++
            totalEmailsCategorized++
          }
        } catch (emailFetchError) {
          console.error(`Error fetching or processing email ${messageId}:`, emailFetchError)
        }
      }
    }

    return NextResponse.json({
      message: "All accounts synced and emails categorized successfully",
      totalEmailsSynced,
      totalEmailsCategorized,
    })
  } catch (error: any) {
    console.error("Sync all emails failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
