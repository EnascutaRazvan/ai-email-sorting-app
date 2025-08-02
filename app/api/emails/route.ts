import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const categoryIds = searchParams.get("categories")?.split(",").filter(Boolean)
    const accountId = searchParams.get("account")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sender = searchParams.get("sender")
    const senderEmail = searchParams.get("senderEmail")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    // Get user settings for pagination
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("emails_per_page")
      .eq("user_id", session.user.id)
      .single()

    const actualLimit = limit || userSettings?.emails_per_page || 10

    // Build the query
    let query = supabase
      .from("emails")
      .select(`
        id,
        subject,
        sender,
        sender_email,
        snippet,
        ai_summary,
        received_at,
        is_read,
        account_id,
        user_accounts!inner(email, name),
        email_categories(
          category_id,
          is_ai_suggested,
          confidence_score,
          categories(id, name, color)
        )
      `)
      .eq("user_id", session.user.id)
      .order("received_at", { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`subject.ilike.%${search}%,sender.ilike.%${search}%,snippet.ilike.%${search}%`)
    }

    if (accountId && accountId !== "all") {
      query = query.eq("account_id", accountId)
    }

    if (sender) {
      query = query.ilike("sender", `%${sender}%`)
    }

    if (senderEmail) {
      query = query.ilike("sender_email", `%${senderEmail}%`)
    }

    if (dateFrom) {
      query = query.gte("received_at", dateFrom)
    }

    if (dateTo) {
      query = query.lte("received_at", dateTo)
    }

    // Get total count for pagination
    const { count: totalCount } = await query.select("*", { count: "exact", head: true })

    // Apply pagination
    query = query.range(offset, offset + actualLimit - 1)

    const { data: emails, error } = await query

    if (error) {
      console.error("Error fetching emails:", error)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    // Filter by categories if specified (after fetching due to junction table complexity)
    let filteredEmails = emails || []

    if (categoryIds && categoryIds.length > 0) {
      if (categoryIds.includes("uncategorized")) {
        // Include emails with no categories or only uncategorized
        filteredEmails = filteredEmails.filter((email) => {
          const categories = email.email_categories || []
          return categories.length === 0 || categories.every((ec) => ec.categories?.name === "Uncategorized")
        })
      } else {
        // Include emails that have at least one of the specified categories
        filteredEmails = filteredEmails.filter((email) => {
          const categories = email.email_categories || []
          return categories.some((ec) => categoryIds.includes(ec.category_id))
        })
      }
    }

    // Transform the data to match the expected format
    const transformedEmails = filteredEmails.map((email) => ({
      id: email.id,
      subject: email.subject,
      sender: email.sender,
      sender_email: email.sender_email,
      snippet: email.snippet,
      ai_summary: email.ai_summary,
      received_at: email.received_at,
      is_read: email.is_read,
      account: {
        id: email.account_id,
        email: email.user_accounts?.email,
        name: email.user_accounts?.name,
      },
      categories: (email.email_categories || [])
        .map((ec) => ({
          id: ec.categories?.id,
          name: ec.categories?.name,
          color: ec.categories?.color,
          is_ai_suggested: ec.is_ai_suggested,
          confidence_score: ec.confidence_score,
        }))
        .filter((cat) => cat.id), // Remove null categories
    }))

    return NextResponse.json({
      emails: transformedEmails,
      pagination: {
        page,
        limit: actualLimit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / actualLimit),
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
