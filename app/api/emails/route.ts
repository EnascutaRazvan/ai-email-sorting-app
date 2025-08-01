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
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    let query = supabase
      .from("emails")
      .select(`
        *,
        categories (
          name,
          color
        ),
        user_accounts (
          email,
          name,
          picture
        )
      `)
      .eq("user_id", session.user.id)
      .order("received_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    const { data: emails, error } = await query

    if (error) {
      throw new Error(`Failed to fetch emails: ${error.message}`)
    }

    // Transform the data to match the expected format
    const transformedEmails =
      emails?.map((email: any) => ({
        ...email,
        category_name: email.categories?.name || null,
        category_color: email.categories?.color || null,
        account_email: email.user_accounts?.email || "",
        account_name: email.user_accounts?.name || null,
        account_picture: email.user_accounts?.picture || null,
      })) || []

    return NextResponse.json({ emails: transformedEmails })
  } catch (error) {
    console.error("Error fetching emails:", error)
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
  }
}
