import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const DEFAULT_CATEGORIES = [
  { name: "Personal", description: "Personal emails from friends and family", color: "#10B981" },
  { name: "Work", description: "Work-related emails and communications", color: "#3B82F6" },
  { name: "Shopping", description: "E-commerce, receipts, and shopping-related emails", color: "#F59E0B" },
  { name: "Promotions", description: "Marketing emails, deals, and promotional content", color: "#EF4444" },
  { name: "Social", description: "Social media notifications and updates", color: "#8B5CF6" },
  { name: "Newsletters", description: "Newsletters, subscriptions, and regular updates", color: "#06B6D4" },
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user already has categories
    const { data: existingCategories } = await supabase.from("categories").select("id").eq("user_id", session.user.id)

    if (existingCategories && existingCategories.length > 0) {
      return NextResponse.json({
        success: true,
        message: "User already has categories",
        categories: existingCategories,
      })
    }

    // Create default categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      user_id: session.user.id,
    }))

    const { data: newCategories, error } = await supabase.from("categories").insert(categoriesToInsert).select()

    if (error) {
      console.error("Error creating default categories:", error)
      return NextResponse.json({ error: "Failed to create categories" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      categories: newCategories,
      message: `Created ${newCategories.length} default categories`,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
