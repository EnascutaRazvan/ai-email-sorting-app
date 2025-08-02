import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user already has categories
    const { data: existingCategories, error: checkError } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", session.user.id)
      .limit(1)

    if (checkError) {
      console.error("Error checking existing categories:", checkError)
      return NextResponse.json({ error: "Failed to check existing categories" }, { status: 500 })
    }

    if (existingCategories && existingCategories.length > 0) {
      return NextResponse.json({
        message: "User already has categories",
        created: false,
      })
    }

    // Call the database function to create default categories
    const { error: createError } = await supabase.rpc("create_default_categories", {
      p_user_id: session.user.id,
    })

    if (createError) {
      console.error("Error creating default categories:", createError)
      return NextResponse.json({ error: "Failed to create default categories" }, { status: 500 })
    }

    // Fetch the created categories
    const { data: categories, error: fetchError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", session.user.id)
      .order("name")

    if (fetchError) {
      console.error("Error fetching created categories:", fetchError)
      return NextResponse.json({ error: "Failed to fetch created categories" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      created: true,
      categories: categories || [],
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
