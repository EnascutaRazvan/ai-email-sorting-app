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

    // Get categories with email counts
    const { data: categories, error } = await supabase
      .from("categories")
      .select(`
        id,
        name,
        description,
        color,
        is_default,
        created_at,
        updated_at
      `)
      .eq("user_id", session.user.id)
      .order("name")

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    // Get email counts for each category
    const { data: emailCounts, error: countError } = await supabase.rpc("get_category_email_counts", {
      p_user_id: session.user.id,
    })

    if (countError) {
      console.error("Error fetching email counts:", countError)
    }

    // Merge categories with email counts
    const categoriesWithCounts = (categories || []).map((category) => {
      const countData = emailCounts?.find((ec) => ec.category_id === category.id)
      return {
        ...category,
        email_count: Number.parseInt(countData?.email_count || "0"),
      }
    })

    return NextResponse.json({
      categories: categoriesWithCounts,
    })
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

    const { name, description, color } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 })
    }

    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim() || "",
        color: color || "#3B82F6",
        is_default: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 })
      }
      console.error("Error creating category:", error)
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      category: {
        ...category,
        email_count: 0,
      },
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
