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

    const { data: categories, error } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        color,
        count(emails)
      `)
      .eq("user_id", session.user.id)
      .order("name", { ascending: true })
      .limit(100) // Limit to prevent excessive data

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    // Fetch uncategorized count separately if needed, or handle in client
    // For now, the `count(emails)` will give the count for each category.
    // If you need a specific "Uncategorized" count, you'd query emails where category_id is null.

    return NextResponse.json({ success: true, categories })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, color } = await request.json()

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
    }

    // Check for existing category with the same name for this user
    const { data: existingCategory, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("name", name)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found
      console.error("Error checking existing category:", fetchError)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (existingCategory) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 })
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: session.user.id,
        name,
        color,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    return NextResponse.json({ success: true, category: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
