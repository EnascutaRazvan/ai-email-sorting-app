import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { google } from "googleapis"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export const dynamic = "force-dynamic" // Ensure this route is dynamic

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cronSecret = searchParams.get("cron_secret")

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()

  try {
    // Fetch all accounts that have connected Gmail
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("*")
      .eq("provider", "google")

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError)
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    let totalEmailsSynced = 0
    let totalEmailsCategorized = 0

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
          let suggestedCategoryName = "Uncategorized" // Default to Uncategorized
          let suggestedCategoryColor = "#9CA3AF" // Default gray

          try {
            const { text: aiResponse } = await generateText({
              model: openai("gpt-4"), // Using OpenAI for categorization and summary
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
            let { data: categoryData, error: categoryError } = await supabase
              .from("categories")
              .select("*")
              .eq("user_id", account.user_id)
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
              const newColor = defaultColors[suggestedCategoryName] || "#9CA3AF" // Default gray

              const { data: newCategory, error: newCategoryError } = await supabase
                .from("categories")
                .insert({
                  user_id: account.user_id,
                  name: suggestedCategoryName,
                  color: newColor,
                })
                .select()
                .single()

              if (newCategoryError) {
                console.error("Error creating new category:", newCategoryError)
                // Fallback to Uncategorized if creation fails
                const { data: uncategorizedCat } = await supabase
                  .from("categories")
                  .select("*")
                  .eq("user_id", account.user_id)
                  .eq("name", "Uncategorized")
                  .single()
                categoryData = uncategorizedCat
              } else {
                categoryData = newCategory
              }
            } else if (categoryError) {
              console.error("Error fetching category:", categoryError)
              // Fallback to Uncategorized if fetching fails
              const { data: uncategorizedCat } = await supabase
                .from("categories")
                .select("*")
                .eq("user_id", account.user_id)
                .eq("name", "Uncategorized")
                .single()
              categoryData = uncategorizedCat
            }

            if (categoryData) {
              suggestedCategoryColor = categoryData.color
            }
          } catch (aiError) {
            console.error("AI categorization/summary failed:", aiError)
            // If AI fails, ensure it falls back to Uncategorized
            const { data: uncategorizedCat } = await supabase
              .from("categories")
              .select("*")
              .eq("user_id", account.user_id)
              .eq("name", "Uncategorized")
              .single()
            if (uncategorizedCat) {
              suggestedCategoryName = uncategorizedCat.name
              suggestedCategoryColor = uncategorizedCat.color
            }
          }

          // Get the actual category ID for the suggested category
          const { data: finalCategory, error: finalCategoryError } = await supabase
            .from("categories")
            .select("id")
            .eq("user_id", account.user_id)
            .eq("name", suggestedCategoryName)
            .single()

          if (finalCategoryError || !finalCategory) {
            console.error("Could not find final category ID:", finalCategoryError)
            // This should ideally not happen if ensure-uncategorized is run and categories are created
            continue
          }

          const { error: insertEmailError } = await supabase.from("emails").insert({
            user_id: account.user_id,
            account_id: account.id,
            message_id: messageId,
            thread_id: msg.data.threadId,
            subject: subject,
            sender: sender,
            snippet: snippet,
            received_at: new Date(receivedAt).toISOString(),
            is_read: msg.data.labelIds?.includes("UNREAD") ? false : true,
            ai_summary: aiSummary,
            category_id: finalCategory.id, // Assign the suggested category
            suggested_category_id: finalCategory.id, // Store the AI suggested category
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
      message: "Emails synced and categorized successfully",
      totalEmailsSynced,
      totalEmailsCategorized,
    })
  } catch (error: any) {
    console.error("Cron job failed:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
