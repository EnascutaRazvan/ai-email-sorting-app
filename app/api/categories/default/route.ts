import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const DEFAULT_CATEGORIES = [
  {
    name: "Personal",
    description: "Personal emails from friends, family, and personal contacts",
    color: "#10B981", // Green
  },
  {
    name: "Work",
    description: "Work-related emails, meetings, projects, and professional communications",
    color: "#3B82F6", // Blue
  },
  {
    name: "Shopping",
    description: "E-commerce, orders, receipts, shipping notifications, and shopping-related emails",
    color: "#F59E0B", // Amber
  },
  {
    name: "Promotions",
    description: "Marketing emails, deals, offers, discounts, and promotional content",
    color: "#EF4444", // Red
  },
  {
    name: "Social",
    description: "Social media notifications, social platforms, and community updates",
    color: "#8B5CF6", // Purple
  },
  {
    name: "Newsletters",
    description: "Newsletters, subscriptions, blogs, and informational content",
    color: "#06B6D4", // Cyan
  },
]

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
        created: false,
        message: "User already has categories",
      })
    }

    // Create default categories
    const categoriesToInsert = DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      user_id: session.user.id,
      is_default: true,
    }))

    const { data: createdCategories, error: insertError } = await supabase
      .from("categories")
      .insert(categoriesToInsert)
      .select()

    if (insertError) {
      console.error("Error creating default categories:", insertError)
      return NextResponse.json({ error: "Failed to create default categories" }, { status: 500 })
    }

    return NextResponse.json({
      created: true,
      categories: createdCategories,
      message: `Created ${DEFAULT_CATEGORIES.length} default categories`,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
