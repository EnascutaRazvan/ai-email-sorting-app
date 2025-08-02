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
    const category = searchParams.get("category")
    const account = searchParams.get("account")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const sender = searchParams.get("sender")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    let query = supabase
      .from("emails")
      .select(`
        *,
        category:categories(id, name, color),
        suggested_category:categories!emails_suggested_category_id_fkey(id, name, color),
        account:user_accounts(email, name)
      `)
      .eq("user_id", session.user.id)

    // Apply filters
    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,sender.ilike.%${search}%,snippet.ilike.%${search}%,ai_summary.ilike.%${search}%`,
      )
    }

    if (category && category !== "all") {
      if (category === "uncategorized") {
        query = query.is("category_id", null)
      } else {
        query = query.eq("category_id", category)
      }
    }

    if (account && account !== "all") {
      query = query.eq("account_id", account)
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

    // Get total count for pagination
    const { count } = await supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)

    // Apply pagination and ordering
    const offset = (page - 1) * limit
    query = query.order("received_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data: emails, error } = await query

    if (error) {
      console.error("Error fetching emails:", error)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    return NextResponse.json({
      emails: emails || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
