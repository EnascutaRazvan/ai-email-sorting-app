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
    const categoryId = searchParams.get("category")
    const accountId = searchParams.get("account")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sender = searchParams.get("sender")
    const search = searchParams.get("search")
    const isRead = searchParams.get("isRead")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit
    const sortBy = searchParams.get("sortBy") || "received_at"
    const sortOrder = searchParams.get("sortOrder") || "desc"

    let query = supabase
      .from("emails")
      .select(
        `
        id,
        subject,
        sender,
        sender_email,
        snippet,
        received_at,
        is_read,
        category_id,
        account_id,
        categories(id, name, color),
        user_accounts(email, name)
      `,
        { count: "exact" },
      )
      .eq("user_id", session.user.id)

    // Apply filters
    if (categoryId && categoryId !== "all") {
      if (categoryId === "uncategorized") {
        query = query.is("category_id", null)
      } else {
        query = query.eq("category_id", categoryId)
      }
    }

    if (accountId && accountId !== "all") {
      query = query.eq("account_id", accountId)
    }

    if (dateFrom) {
      query = query.gte("received_at", dateFrom)
    }

    if (dateTo) {
      query = query.lte("received_at", dateTo)
    }

    if (sender) {
      query = query.ilike("sender", `%${sender}%`)
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,sender.ilike.%${search}%,snippet.ilike.%${search}%,ai_summary.ilike.%${search}%`,
      )
    }

    if (isRead !== null && isRead !== "all") {
      query = query.eq("is_read", isRead === "true")
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: emails, error, count } = await query

    if (error) {
      console.error("Error fetching emails:", error)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    // Transform the data to include account and category information
    const transformedEmails = emails.map((email) => ({
      ...email,
      category: email.categories
        ? {
            id: email.categories.id,
            name: email.categories.name,
            color: email.categories.color,
          }
        : null,
      account: email.user_accounts
        ? {
            email: email.user_accounts.email,
            name: email.user_accounts.name,
          }
        : null,
    }))

    return NextResponse.json({ success: true, emails: transformedEmails, totalCount: count })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
