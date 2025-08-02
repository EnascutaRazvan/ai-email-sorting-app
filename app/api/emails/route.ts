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

    // First, get all connected accounts for the current user
    const { data: connectedAccounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("id")
      .eq("user_id", session.user.id)

    if (accountsError) {
      console.error("Error fetching connected accounts:", accountsError)
      return NextResponse.json({ error: "Failed to fetch connected accounts" }, { status: 500 })
    }

    const connectedAccountIds = connectedAccounts.map((acc) => acc.id)

    if (connectedAccountIds.length === 0) {
      // No connected accounts, return empty result
      return NextResponse.json({ success: true, emails: [] })
    }

    // Only show emails from currently connected accounts
    let query = supabase
      .from("emails")
      .select(`
        *,
        categories(id, name, color),
        user_accounts(email, name)
      `)
      .eq("user_id", session.user.id)
      .in("account_id", connectedAccountIds) // Only emails from connected accounts
      .order("received_at", { ascending: false })
      .limit(100)

    // Apply filters
    if (categoryId && categoryId !== "all") {
      if (categoryId === "uncategorized") {
        query = query.is("category_id", null)
      } else {
        query = query.eq("category_id", categoryId)
      }
    }

    if (accountId) {
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

    const { data: emails, error } = await query

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

    return NextResponse.json({ success: true, emails: transformedEmails })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
