import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
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
    // This route should ideally be protected by a cron job secret or similar
    // For simplicity, we'll proceed assuming it's triggered securely.

    // Fetch all user accounts that need syncing
    const { data: userAccounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("id, user_id, email, access_token, refresh_token, expires_at")
      .not("refresh_token", "is", null) // Only sync accounts with refresh tokens

    if (accountsError) {
      console.error("Error fetching user accounts for sync:", accountsError)
      return NextResponse.json({ error: "Failed to fetch user accounts" }, { status: 500 })
    }

    if (!userAccounts || userAccounts.length === 0) {
      return NextResponse.json({ message: "No accounts to sync" })
    }

    const syncResults: any[] = []

    for (const account of userAccounts) {
      let currentAccessToken = account.access_token
      let isTokenRefreshed = false

      // Check if token is expired or about to expire (e.g., within 5 minutes)
      const expiresAtDate = new Date(account.expires_at)
      if (expiresAtDate.getTime() < Date.now() + 5 * 60 * 1000) {
        console.log(`Refreshing token for account: ${account.email}`)
        const newAccessToken = await refreshGoogleAccessToken(account.refresh_token!)
        if (newAccessToken) {
          currentAccessToken = newAccessToken
          isTokenRefreshed = true
          // Update the access token in Supabase
          await supabase
            .from("user_accounts")
            .update({ access_token: newAccessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }) // Assuming 1 hour validity
            .eq("id", account.id)
        } else {
          console.error(`Failed to refresh token for account: ${account.email}. Skipping sync.`)
          syncResults.push({
            accountId: account.id,
            email: account.email,
            status: "failed",
            reason: "token_refresh_failed",
          })
          continue
        }
      }

      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({ access_token: currentAccessToken })
      const gmail = google.gmail({ version: "v1", auth: oauth2Client })

      try {
        // Get the last synced history ID for this account
        const { data: lastSyncData, error: syncError } = await supabase
          .from("user_accounts")
          .select("last_sync_history_id")
          .eq("id", account.id)
          .single()

        if (syncError && syncError.code !== "PGRST116") {
          console.error(`Error fetching last_sync_history_id for ${account.email}:`, syncError)
          syncResults.push({ accountId: account.id, email: account.email, status: "failed", reason: "db_fetch_error" })
          continue
        }

        const historyId = lastSyncData?.last_sync_history_id

        // If no historyId, fetch initial emails (e.g., last 100) and get current historyId
        if (!historyId) {
          console.log(`Initial sync for account: ${account.email}`)
          const listResponse = await gmail.users.messages.list({
            userId: "me",
            maxResults: 100, // Fetch initial batch
          })

          const messages = listResponse.data.messages || []
          const currentHistoryId = listResponse.data.historyId

          if (messages.length > 0) {
            for (const msg of messages) {
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
                const part = emailData.payload.parts.find(
                  (p) => p.mimeType === "text/plain" || p.mimeType === "text/html",
                )
                if (part?.body?.data) {
                  bodyContent = Buffer.from(part.body.data, "base64").toString("utf8")
                }
              } else if (emailData.payload?.body?.data) {
                bodyContent = Buffer.from(emailData.payload.body.data, "base64").toString("utf8")
              }

              // Categorize with AI
              const category_id = await categorizeEmailWithAI(
                subject + " " + snippet + " " + bodyContent.substring(0, 500),
                account.user_id,
              )

              const { error: insertError } = await supabase.from("emails").upsert(
                {
                  id: emailData.id!,
                  user_id: account.user_id,
                  account_id: account.id,
                  thread_id: emailData.threadId!,
                  subject,
                  sender,
                  sender_email: senderEmail,
                  snippet,
                  received_at: receivedAt,
                  is_read: isRead,
                  category_id: category_id,
                  full_content: bodyContent,
                },
                { onConflict: "id" },
              )

              if (insertError) {
                console.error(`Error inserting email ${emailData.id}:`, insertError)
              }
            }
          }

          // Update last_sync_history_id for the account
          await supabase.from("user_accounts").update({ last_sync_history_id: currentHistoryId }).eq("id", account.id)

          syncResults.push({
            accountId: account.id,
            email: account.email,
            status: "initial_sync_complete",
            syncedEmails: messages.length,
          })
        } else {
          // Incremental sync using history API
          console.log(`Incremental sync for account: ${account.email} from historyId: ${historyId}`)
          const historyResponse = await gmail.users.history.list({
            userId: "me",
            startHistoryId: historyId,
            historyTypes: ["messageAdded", "messageDeleted", "labelAdded", "labelRemoved"],
          })

          const history = historyResponse.data.history || []
          const newHistoryId = historyResponse.data.historyId || historyId // Use current if no new history

          let addedCount = 0
          let deletedCount = 0
          let updatedCount = 0

          for (const entry of history) {
            if (entry.messagesAdded) {
              for (const msgAdded of entry.messagesAdded) {
                const msgId = msgAdded.message?.id
                if (msgId) {
                  const getResponse = await gmail.users.messages.get({
                    userId: "me",
                    id: msgId,
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

                  let bodyContent = ""
                  if (emailData.payload?.parts) {
                    const part = emailData.payload.parts.find(
                      (p) => p.mimeType === "text/plain" || p.mimeType === "text/html",
                    )
                    if (part?.body?.data) {
                      bodyContent = Buffer.from(part.body.data, "base64").toString("utf8")
                    }
                  } else if (emailData.payload?.body?.data) {
                    bodyContent = Buffer.from(emailData.payload.body.data, "base64").toString("utf8")
                  }

                  const category_id = await categorizeEmailWithAI(
                    subject + " " + snippet + " " + bodyContent.substring(0, 500),
                    account.user_id,
                  )

                  const { error: insertError } = await supabase.from("emails").upsert(
                    {
                      id: emailData.id!,
                      user_id: account.user_id,
                      account_id: account.id,
                      thread_id: emailData.threadId!,
                      subject,
                      sender,
                      sender_email: senderEmail,
                      snippet,
                      received_at: receivedAt,
                      is_read: isRead,
                      category_id: category_id,
                      full_content: bodyContent,
                    },
                    { onConflict: "id" },
                  )
                  if (insertError) console.error(`Error upserting added email ${msgId}:`, insertError)
                  else addedCount++
                }
              }
            }
            if (entry.messagesDeleted) {
              for (const msgDeleted of entry.messagesDeleted) {
                const msgId = msgDeleted.message?.id
                if (msgId) {
                  const { error: deleteError } = await supabase.from("emails").delete().eq("id", msgId)
                  if (deleteError) console.error(`Error deleting email ${msgId}:`, deleteError)
                  else deletedCount++
                }
              }
            }
            if (entry.labelsAdded || entry.labelsRemoved) {
              // Handle label changes (e.g., marking as read/unread)
              const messageId = entry.labelsAdded?.[0]?.message?.id || entry.labelsRemoved?.[0]?.message?.id
              if (messageId) {
                const getResponse = await gmail.users.messages.get({
                  userId: "me",
                  id: messageId,
                  format: "minimal", // Only need labelIds for read status
                })
                const emailData = getResponse.data
                const isRead = !emailData.labelIds?.includes("UNREAD")
                const { error: updateError } = await supabase
                  .from("emails")
                  .update({ is_read: isRead })
                  .eq("id", messageId)
                if (updateError) console.error(`Error updating read status for email ${messageId}:`, updateError)
                else updatedCount++
              }
            }
          }

          // Update last_sync_history_id for the account
          if (newHistoryId && newHistoryId !== historyId) {
            await supabase.from("user_accounts").update({ last_sync_history_id: newHistoryId }).eq("id", account.id)
          }

          syncResults.push({
            accountId: account.id,
            email: account.email,
            status: "incremental_sync_complete",
            added: addedCount,
            deleted: deletedCount,
            updated: updatedCount,
          })
        }
      } catch (gmailError: any) {
        console.error(`Error syncing Gmail for account ${account.email}:`, gmailError.message)
        syncResults.push({ accountId: account.id, email: account.email, status: "failed", reason: gmailError.message })
      }
    }

    return NextResponse.json({ success: true, syncResults })
  } catch (error) {
    console.error("Cron sync API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
