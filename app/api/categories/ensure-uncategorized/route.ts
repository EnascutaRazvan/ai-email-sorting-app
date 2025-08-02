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

    const userId = session.user.id

    // Define default categories with distinct colors
    const defaultCategories = [
      { name: "Uncategorized", color: "#9ca3af" }, // Gray
      { name: "Promotions", color: "#facc15" }, // Yellow
      { name: "Social", color: "#3b82f6" }, // Blue
      { name: "Updates", color: "#10b981" }, // Green
      { name: "Forums", color: "#ef4444" }, // Red
    ]

    const createdCategories = []

    for (const defaultCat of defaultCategories) {
      const { data: existingCategory, error: fetchError } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .eq("name", defaultCat.name)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 means no rows found
        console.error(`Error checking existing category ${defaultCat.name}:`, fetchError)
        continue
      }

      if (!existingCategory) {
        const { data: newCategory, error: insertError } = await supabase
          .from("categories")
          .insert({
            user_id: userId,
            name: defaultCat.name,
            color: defaultCat.color,
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error inserting default category ${defaultCat.name}:`, insertError)
        } else if (newCategory) {
          createdCategories.push(newCategory)
        }
      }
    }

    return NextResponse.json({ success: true, createdCategories })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
