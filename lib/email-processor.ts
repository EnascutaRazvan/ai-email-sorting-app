import { createClient } from "@supabase/supabase-js"
import { GmailService, type GmailMessage } from "./gmail"
import { categorizeEmail, type EmailCategorizationRequest } from "./openai"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface ProcessEmailsResult {
  processed: number
  categorized: number
  archived: number
  errors: string[]
}

export class EmailProcessor {
  private userId: string
  private gmailService: GmailService

  constructor(userId: string, accessToken: string) {
    this.userId = userId
    this.gmailService = new GmailService(accessToken)
  }

  async processNewEmails(): Promise<ProcessEmailsResult> {
    const result: ProcessEmailsResult = {
      processed: 0,
      categorized: 0,
      archived: 0,
      errors: [],
    }

    try {
      // Ensure our processing label exists
      await this.gmailService.createLabelIfNotExists("processed-by-ai-sorter")

      // Get user's categories
      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, description")
        .eq("user_id", this.userId)

      if (categoriesError) {
        throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
      }

      // Get new emails from Gmail
      const newEmails = await this.gmailService.getNewEmails()

      if (newEmails.length === 0) {
        return result
      }

      // Get user's account info for storing emails
      const { data: account, error: accountError } = await supabase
        .from("user_accounts")
        .select("id")
        .eq("user_id", this.userId)
        .eq("is_primary", true)
        .single()

      if (accountError || !account) {
        throw new Error("Failed to find user account")
      }

      // Process each email
      for (const email of newEmails) {
        try {
          await this.processEmail(email, account.id, categories || [])
          result.processed++
          result.archived++
        } catch (error) {
          console.error(`Error processing email ${email.id}:`, error)
          result.errors.push(`Email ${email.id}: ${error}`)
        }
      }

      return result
    } catch (error) {
      console.error("Error in processNewEmails:", error)
      result.errors.push(`General error: ${error}`)
      return result
    }
  }

  private async processEmail(
    email: GmailMessage,
    accountId: string,
    categories: Array<{ id: string; name: string; description: string }>,
  ): Promise<void> {
    let categoryId: string | null = null
    let aiSummary = email.snippet

    // Only categorize if we have categories
    if (categories.length > 0) {
      try {
        const categorizationRequest: EmailCategorizationRequest = {
          subject: email.subject,
          sender: email.sender,
          snippet: email.snippet,
          categories,
        }

        const aiResult = await categorizeEmail(categorizationRequest)

        // Only use the category if confidence is high enough
        if (aiResult.confidence >= 0.7 && aiResult.categoryId) {
          categoryId = aiResult.categoryId
        }

        aiSummary = aiResult.summary
      } catch (error) {
        console.error(`AI categorization failed for email ${email.id}:`, error)
        // Continue without categorization
      }
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase.from("emails").select("id").eq("id", email.id).single()

    if (existingEmail) {
      console.log(`Email ${email.id} already exists, skipping`)
      return
    }

    // Store email in database
    const { error: insertError } = await supabase.from("emails").insert({
      id: email.id,
      user_id: this.userId,
      account_id: accountId,
      category_id: categoryId,
      subject: email.subject,
      sender: email.sender,
      snippet: email.snippet,
      ai_summary: aiSummary,
      received_at: email.receivedAt.toISOString(),
      is_read: email.isRead,
      gmail_thread_id: email.threadId,
    })

    if (insertError) {
      throw new Error(`Failed to store email: ${insertError.message}`)
    }

    // Archive the email in Gmail
    await this.gmailService.archiveEmail(email.id)
  }
}
