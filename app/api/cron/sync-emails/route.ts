import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Starting scheduled email sync...")

    // Get all active user accounts that need syncing
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select(`
        id,
        user_id,
        email,
        access_token,
        last_sync,
        users!inner(id, email)
      `)
      .eq("is_active", true)
      .not("access_token", "is", null)

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      console.log("No active accounts found for syncing")
      return NextResponse.json({
        success: true,
        message: "No accounts to sync",
        synced: 0,
      })
    }

    console.log(`Found ${accounts.length} accounts to sync`)

    let totalSynced = 0
    let totalImported = 0
    const errors: string[] = []

    // Process each account
    for (const account of accounts) {
      try {
        console.log(`Syncing account: ${account.email}`)

        // Determine date range for sync
        let afterDate: string
        if (account.last_sync) {
          // Sync emails since last sync (minus 1 hour buffer)
          const lastSync = new Date(account.last_sync)
          lastSync.setHours(lastSync.getHours() - 1) // 1 hour buffer
          afterDate = lastSync.toISOString().split("T")[0].replace(/-/g, "/")
        } else {
          // First sync - get emails from last 7 days
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          afterDate = weekAgo.toISOString().split("T")[0].replace(/-/g, "/")
        }

        // Fetch new emails from Gmail
        const gmailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:${afterDate}&maxResults=20`,
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          },
        )

        if (!gmailResponse.ok) {
          if (gmailResponse.status === 401) {
            // Token expired - mark account as inactive
            await supabase.from("user_accounts").update({ is_active: false }).eq("id", account.id)

            errors.push(`Account ${account.email}: Token expired, marked inactive`)
            continue
          }
          throw new Error(`Gmail API error: ${gmailResponse.statusText}`)
        }

        const gmailData = await gmailResponse.json()
        const messageIds = gmailData.messages || []

        let importedCount = 0

        // Process new emails
        for (const messageRef of messageIds) {
          try {
            // Check if email already exists
            const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", messageRef.id).single()

            if (existingEmail) {
              continue // Skip if already imported
            }

            // Fetch email details
            const emailResponse = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`,
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                },
              },
            )

            if (!emailResponse.ok) {
              continue // Skip this email
            }

            const emailData = await emailResponse.json()

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

            // Insert email (without AI processing for cron to keep it fast)
            const { error: insertError } = await supabase.from("emails").insert({
              id: emailData.id,
              user_id: account.user_id,
              account_id: account.id,
              subject,
              sender,
              snippet: emailData.snippet,
              email_body: emailBody,
              received_at: receivedAt.toISOString(),
              is_read: false,
              gmail_thread_id: emailData.threadId,
            })

            if (!insertError) {
              importedCount++

              // Archive email in Gmail
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
                // Don't fail if archiving fails
                console.error("Archive error:", archiveError)
              }
            }
          } catch (emailError) {
            console.error(`Error processing email:`, emailError)
            // Continue with next email
          }
        }

        // Update last sync time
        await supabase.from("user_accounts").update({ last_sync: new Date().toISOString() }).eq("id", account.id)

        totalSynced++
        totalImported += importedCount

        console.log(`Synced ${account.email}: ${importedCount} new emails`)
      } catch (accountError) {
        console.error(`Error syncing account ${account.email}:`, accountError)
        errors.push(`${account.email}: ${accountError.message}`)
      }
    }

    console.log(`Cron sync completed: ${totalSynced}/${accounts.length} accounts, ${totalImported} emails imported`)

    return NextResponse.json({
      success: true,
      message: `Synced ${totalSynced}/${accounts.length} accounts`,
      accountsSynced: totalSynced,
      totalAccounts: accounts.length,
      emailsImported: totalImported,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Cron sync error:", error)
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
