import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { GmailService } from "@/lib/gmail"
import { categorizeEmail } from "@/lib/openai"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all connected accounts for this user
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("user_id", session.user.id)

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No connected accounts found" }, { status: 400 })
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

    let totalImported = 0
    const results = []

    // Process emails for each connected account
    for (const account of accounts) {
      try {
        console.log(`Processing emails for account: ${account.email}`)

        const gmailService = new GmailService(account.access_token, account.refresh_token)
        const emails = await gmailService.getRecentEmails(20) // Limit to 20 recent emails per account

        console.log(`Found ${emails.length} emails for ${account.email}`)

        for (const email of emails) {
          try {
            // Check if email already exists
            const { data: existingEmail } = await supabase
              .from("emails")
              .select("id")
              .eq("gmail_id", email.id)
              .eq("user_id", session.user.id)
              .single()

            if (existingEmail) {
              console.log(`Email ${email.id} already exists, skipping`)
              continue
            }

            // Categorize and summarize email using AI
            let categoryId = null
            let aiSummary = email.snippet

            if (categories && categories.length > 0) {
              console.log(`Categorizing email: ${email.subject}`)

              const categorization = await categorizeEmail(email.subject, email.body || email.snippet, categories)

              // Find matching category
              const matchedCategory = categories.find(
                (cat) => cat.name.toLowerCase() === categorization.category.toLowerCase(),
              )

              if (matchedCategory) {
                categoryId = matchedCategory.id
              }

              aiSummary = categorization.summary
            }

            // Store email in database
            const { error: insertError } = await supabase.from("emails").insert({
              user_id: session.user.id,
              account_id: account.id,
              gmail_id: email.id,
              thread_id: email.threadId,
              subject: email.subject,
              sender: email.from,
              recipient: email.to,
              snippet: email.snippet,
              body: email.body,
              ai_summary: aiSummary,
              category_id: categoryId,
              received_at: email.date.toISOString(),
              is_read: email.isRead,
              labels: email.labels,
              account_email: account.email,
              account_name: account.name,
              account_picture: account.picture,
            })

            if (insertError) {
              console.error(`Error inserting email ${email.id}:`, insertError)
              continue
            }

            // Archive the email in Gmail (remove from inbox)
            try {
              await gmailService.archiveEmail(email.id)
              console.log(`Archived email ${email.id} in Gmail`)
            } catch (archiveError) {
              console.error(`Error archiving email ${email.id}:`, archiveError)
              // Continue even if archiving fails
            }

            totalImported++
          } catch (emailError) {
            console.error(`Error processing email ${email.id}:`, emailError)
            continue
          }
        }

        results.push({
          account: account.email,
          processed: emails.length,
          imported: totalImported,
        })
      } catch (accountError) {
        console.error(`Error processing account ${account.email}:`, accountError)
        results.push({
          account: account.email,
          error: accountError.message,
        })
        continue
      }
    }

    return NextResponse.json({
      success: true,
      totalImported,
      results,
      message: `Successfully imported ${totalImported} new emails`,
    })
  } catch (error) {
    console.error("Email import error:", error)
    return NextResponse.json({ error: "Failed to import emails", details: error.message }, { status: 500 })
  }
}
