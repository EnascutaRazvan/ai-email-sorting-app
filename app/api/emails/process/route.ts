import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { fetchNewEmails, archiveEmail } from "@/lib/gmail"
import { categorizeAndSummarizeEmail } from "@/lib/openai"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's connected accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("user_id", session.user.id)

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    // Get user's categories
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", session.user.id)

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    let totalProcessed = 0
    const results = []

    // Process emails for each connected account
    for (const account of accounts) {
      try {
        // Get last sync time for this account
        const { data: lastEmail } = await supabase
          .from("emails")
          .select("received_at")
          .eq("account_id", account.id)
          .order("received_at", { ascending: false })
          .limit(1)
          .single()

        const lastSyncTime = lastEmail?.received_at ? new Date(lastEmail.received_at) : undefined

        // Fetch new emails from Gmail
        const newEmails = await fetchNewEmails(account.access_token, account.refresh_token, lastSyncTime)

        console.log(`Found ${newEmails.length} new emails for account ${account.email}`)

        // Process each email
        for (const email of newEmails) {
          try {
            // Check if email already exists
            const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", email.id).single()

            if (existingEmail) {
              console.log(`Email ${email.id} already processed, skipping`)
              continue
            }

            // Categorize and summarize with AI
            const aiResult = await categorizeAndSummarizeEmail(email.subject, email.snippet, email.sender, categories)

            // Find matching category or create "Uncategorized"
            let categoryId = null
            if (aiResult.category !== "Uncategorized") {
              const matchingCategory = categories.find(
                (cat) => cat.name.toLowerCase() === aiResult.category.toLowerCase(),
              )
              categoryId = matchingCategory?.id || null
            }

            // If no category found and AI suggested something other than "Uncategorized",
            // create the category
            if (!categoryId && aiResult.category !== "Uncategorized") {
              const { data: newCategory, error: categoryError } = await supabase
                .from("categories")
                .insert({
                  user_id: session.user.id,
                  name: aiResult.category,
                  description: `Auto-created category for ${aiResult.category} emails`,
                  color: "#6B7280", // Gray color for auto-created categories
                })
                .select()
                .single()

              if (!categoryError && newCategory) {
                categoryId = newCategory.id
                categories.push(newCategory) // Add to local array for future emails
              }
            }

            // Store email in database
            const { error: emailError } = await supabase.from("emails").insert({
              id: email.id,
              user_id: session.user.id,
              account_id: account.id,
              category_id: categoryId,
              subject: email.subject,
              sender: email.sender,
              snippet: email.snippet,
              ai_summary: aiResult.summary,
              received_at: email.receivedAt.toISOString(),
              is_read: email.isRead,
              gmail_thread_id: email.threadId,
            })

            if (emailError) {
              console.error(`Error storing email ${email.id}:`, emailError)
              continue
            }

            // Archive email in Gmail
            await archiveEmail(account.access_token, account.refresh_token, email.id)

            totalProcessed++
            console.log(`Processed email: ${email.subject} -> ${aiResult.category}`)
          } catch (error) {
            console.error(`Error processing email ${email.id}:`, error)
            continue
          }
        }

        results.push({
          account: account.email,
          processed: newEmails.length,
        })
      } catch (error) {
        console.error(`Error processing account ${account.email}:`, error)
        results.push({
          account: account.email,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed,
      results,
    })
  } catch (error) {
    console.error("Email processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
