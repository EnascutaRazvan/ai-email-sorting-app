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
  const { emailIds } = await request.json()

  if (!Array.isArray(emailIds) || emailIds.length === 0) {
    return NextResponse.json({ error: "No email IDs provided for recategorization" }, { status: 400 })
  }

  let updatedCount = 0
  const errors: string[] = []

  // Ensure 'Uncategorized' category exists for the user
  const { data: uncategorizedData, error: uncategorizedError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("name", "Uncategorized")
    .single()

  const uncategorizedCategoryId = uncategorizedData?.id
  if (uncategorizedError || !uncategorizedCategoryId) {
    // This should ideally not happen if ensure-uncategorized is called on app load
    console.error("Uncategorized category not found for user:", uncategorizedError)
    return NextResponse.json({ error: "Uncategorized category not found, please refresh" }, { status: 500 })
  }

  for (const emailId of emailIds) {
    try {
      // 1. Fetch email details from your database
      const { data: email, error: emailError } = await supabase
        .from("emails")
        .select("message_id, account_id, subject, sender, snippet")
        .eq("id", emailId)
        .eq("user_id", session.user.id)
        .single()

      if (emailError || !email) {
        errors.push(`Email ${emailId} not found or unauthorized: ${emailError?.message}`)
        continue
      }

      // 2. Fetch account details to get Gmail tokens
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("access_token, refresh_token, expires_at, email")
        .eq("id", email.account_id)
        .eq("user_id", session.user.id)
        .single()

      if (accountError || !account) {
        errors.push(`Account for email ${emailId} not found or unauthorized: ${accountError?.message}`)
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

      // Fetch full content for better AI analysis
      let fullContent = ""
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: email.message_id,
          format: "full",
        })
        if (msg.data.payload?.parts) {
          const part = msg.data.payload.parts.find((p) => p.mimeType === "text/plain" || p.mimeType === "text/html")
          if (part?.body?.data) {
            fullContent = Buffer.from(part.body.data, "base64").toString("utf8")
          }
        } else if (msg.data.payload?.body?.data) {
          fullContent = Buffer.from(msg.data.payload.body.data, "base64").toString("utf8")
        }
      } catch (gmailFetchError: any) {
        console.warn(`Could not fetch full content for email ${email.message_id}: ${gmailFetchError.message}`)
        // Continue with snippet if full content fails
      }

      // AI Categorization and Summary
      let aiSummary = ""
      let suggestedCategoryName = "Uncategorized"
      let suggestedCategoryId = uncategorizedCategoryId

      try {
        const { text: aiResponse } = await generateText({
          model: openai("gpt-4o"), // Using OpenAI for categorization and summary
          prompt: `Analyze the following email and provide a concise summary (max 50 words) and suggest a single category from the following list: Work, Personal, Promotions, Social, Updates, Forums, Purchases, Finance, Travel, Health, Education, Newsletters, Spam, Uncategorized. If none fit well, use 'Uncategorized'.
          
          Email Subject: ${email.subject}
          Email Sender: ${email.sender}
          Email Snippet: ${email.snippet}
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
          .eq("user_id", session.user.id)
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
              user_id: session.user.id,
              name: suggestedCategoryName,
              color: newColor,
            })
            .select()
            .single()

          if (newCategoryError) {
            console.error("Error creating new category during recategorization:", newCategoryError)
            suggestedCategoryId = uncategorizedCategoryId
          } else {
            suggestedCategoryId = newCategory.id
          }
        } else if (categoryError) {
          console.error("Error fetching category during recategorization:", categoryError)
          suggestedCategoryId = uncategorizedCategoryId
        } else {
          suggestedCategoryId = categoryData.id
        }
      } catch (aiError) {
        console.error("AI categorization/summary failed during recategorization:", aiError)
        suggestedCategoryId = uncategorizedCategoryId
      }

      // Update email in database
      const { error: updateError } = await supabase
        .from("emails")
        .update({
          ai_summary: aiSummary,
          category_id: suggestedCategoryId,
          suggested_category_id: suggestedCategoryId, // Update suggested_category_id as well
        })
        .eq("id", emailId)
        .eq("user_id", session.user.id)

      if (updateError) {
        errors.push(`Failed to update email ${emailId} in database: ${updateError.message}`)
      } else {
        updatedCount++
      }
    } catch (overallError: any) {
      errors.push(`An unexpected error occurred for email ${emailId}: ${overallError.message}`)
    }
  }

  if (errors.length > 0) {
    console.error("Recategorization errors:", errors)
    return NextResponse.json(
      {
        message: `Completed recategorization with ${updatedCount} emails updated, but with errors.`,
        updated: updatedCount,
        errors,
      },
      { status: 200 },
    )
  }

  return NextResponse.json({ message: "Emails recategorized successfully", updated: updatedCount })
}
