import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const userId = session.user.id

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const categoryId = searchParams.get("category")
  const accountId = searchParams.get("account")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const sender = searchParams.get("sender")

  let query = supabase
    .from("emails")
    .select(
      `
      id,
      subject,
      sender,
      snippet,
      ai_summary,
      received_at,
      is_read,
      category:categories!category_id(id, name, color),
      account:accounts!account_id(id, email, name),
      suggested_category:categories!suggested_category_id(id, name, color)
    `,
    )
    .eq("user_id", userId)

  if (search) {
    query = query.ilike("subject", `%${search}%`).or(`snippet.ilike.%${search}%,sender.ilike.%${search}%`)
  }

  if (categoryId && categoryId !== "all") {
    if (categoryId === "uncategorized") {
      // Find the actual ID for 'Uncategorized' category for this user
      const { data: uncategorizedCat, error: catError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .eq("name", "Uncategorized")
        .single()

      if (catError || !uncategorizedCat) {
        console.error("Error finding Uncategorized category ID:", catError)
        // If uncategorized category is not found, return no emails for this filter
        return NextResponse.json({ emails: [] })
      }
      query = query.eq("category_id", uncategorizedCat.id)
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

  query = query.order("received_at", { ascending: false })

  const { data: emails, error } = await query

  if (error) {
    console.error("Error fetching emails:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ emails })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { emailId, categoryId, isRead } = await request.json()

  if (!emailId) {
    return NextResponse.json({ error: "Email ID is required" }, { status: 400 })
  }

  const updateData: { category_id?: string; is_read?: boolean } = {}
  if (categoryId !== undefined) {
    updateData.category_id = categoryId
  }
  if (isRead !== undefined) {
    updateData.is_read = isRead
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No update data provided" }, { status: 400 })
  }

  const { data: email, error } = await supabase
    .from("emails")
    .update(updateData)
    .eq("id", emailId)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating email:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ email })
}
