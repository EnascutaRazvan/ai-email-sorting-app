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
    const categoryId = searchParams.get("categoryId")
    const accountId = searchParams.get("accountId")
    const search = searchParams.get("search")
    const isRead = searchParams.get("isRead")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    let query = supabase
      .from("emails")
      .select(`
        *,
        category:categories(id, name, color),
        suggested_category:categories!emails_suggested_category_id_fkey(id, name, color),
        account:user_accounts(id, email, name)
      `)
      .eq("user_id", session.user.id)
      .order("received_at", { ascending: false })

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

    if (search) {
      query = query.or(`subject.ilike.%${search}%,sender.ilike.%${search}%,snippet.ilike.%${search}%`)
    }

    if (isRead !== null && isRead !== "all") {
      query = query.eq("is_read", isRead === "true")
    }

    // Get total count for pagination
    const { count } = await supabase
      .from("emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailId, updates } = await request.json()

    if (!emailId) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 })
    }

    const { data: email, error } = await supabase
      .from("emails")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating email:", error)
      return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
    }

    return NextResponse.json({ email })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
