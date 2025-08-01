import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { EmailProcessor } from "@/lib/email-processor"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's primary account with access token
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("access_token, email")
      .eq("user_id", session.user.id)
      .eq("is_primary", true)
      .single()

    if (accountError || !account) {
      return NextResponse.json({ error: "No primary Gmail account found" }, { status: 400 })
    }

    // Create processing job record
    const { data: job, error: jobError } = await supabase
      .from("email_processing_jobs")
      .insert({
        user_id: session.user.id,
        status: "processing",
      })
      .select()
      .single()

    if (jobError) {
      console.error("Error creating processing job:", jobError)
      return NextResponse.json({ error: "Failed to create processing job" }, { status: 500 })
    }

    try {
      // Process emails
      const processor = new EmailProcessor(session.user.id, account.access_token)
      const result = await processor.processNewEmails()

      // Update job status
      await supabase
        .from("email_processing_jobs")
        .update({
          status: result.errors.length > 0 ? "completed_with_errors" : "completed",
          emails_processed: result.processed,
          total_emails: result.processed,
          error_message: result.errors.length > 0 ? result.errors.join("; ") : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)

      return NextResponse.json({
        success: true,
        result: {
          processed: result.processed,
          categorized: result.categorized,
          archived: result.archived,
          errors: result.errors,
        },
        jobId: job.id,
      })
    } catch (processingError) {
      // Update job with error status
      await supabase
        .from("email_processing_jobs")
        .update({
          status: "failed",
          error_message: String(processingError),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)

      throw processingError
    }
  } catch (error) {
    console.error("Email processing error:", error)
    return NextResponse.json(
      {
        error: "Failed to process emails",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get recent processing jobs
    const { data: jobs, error } = await supabase
      .from("email_processing_jobs")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`Failed to fetch processing jobs: ${error.message}`)
    }

    return NextResponse.json({ jobs })
  } catch (error) {
    console.error("Error fetching processing jobs:", error)
    return NextResponse.json({ error: "Failed to fetch processing jobs" }, { status: 500 })
  }
}
