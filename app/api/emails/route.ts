import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createClient } from "@supabase/supabase-js"
import { handleError } from "@/lib/error-handler"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const accountId = searchParams.get("accountId")
    const query = searchParams.get("query")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    // Fetch all connected account IDs for the current user
    const { data: connectedAccounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("id, email")
      .eq("user_id", session.user.id)

    if (accountsError) {
      console.error("Error fetching connected accounts:", accountsError)
      return handleError(accountsError, "Failed to fetch connected accounts", 500)
    }

    const connectedAccountIds = connectedAccounts.map((acc) => acc.id)
    const connectedAccountMap = new Map(connectedAccounts.map((acc) => [acc.id, acc.email]))

    let emailQuery = supabase.from("emails").select("*", { count: "exact" }).in("account_id", connectedAccountIds) // Only fetch emails from connected accounts

    if (categoryId && categoryId !== "all") {
      emailQuery = emailQuery.eq("category_id", categoryId)
    }

    if (query) {
      emailQuery = emailQuery.ilike("subject", `%${query}%`)
    }

    if (accountId && accountId !== "all") {
      emailQuery = emailQuery.eq("account_id", accountId)
    }

    const {
      data: emails,
      error,
      count,
    } = await emailQuery.order("date", { ascending: false }).range(offset, offset + limit - 1)

    if (error) {
      console.error("Error fetching emails:", error)
      return handleError(error, "Failed to fetch emails", 500)
    }

    // Attach account email to each email for display
    const emailsWithAccountInfo = emails.map((email) => ({
      ...email,
      account_email: connectedAccountMap.get(email.account_id),
    }))

    return NextResponse.json({
      emails: emailsWithAccountInfo,
      total: count,
      page,
      limit,
    })
  } catch (error) {
    console.error("Unexpected error fetching emails:", error)
    return handleError(error, "An unexpected error occurred", 500)
  }
}
