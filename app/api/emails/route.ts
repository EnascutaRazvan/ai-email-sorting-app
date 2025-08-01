import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")

    let query = supabase
      .from("emails")
      .select(`
        *,
        categories(name, color)
      `)
      .eq("user_id", session.user.id)
      .order("received_at", { ascending: false })
      .limit(50)

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    const { data: emails, error } = await query

    if (error) {
      console.error("Error fetching emails:", error)
      return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }

    // Transform the data to include category information
    const transformedEmails = emails.map((email) => ({
      ...email,
      category_name: email.categories?.name || null,
      category_color: email.categories?.color || null,
    }))

    return NextResponse.json({ emails: transformedEmails })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
