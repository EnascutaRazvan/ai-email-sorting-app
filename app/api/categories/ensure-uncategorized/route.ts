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

    // Check if "Uncategorized" category exists
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("name", "Uncategorized")
      .single()

    if (existingCategory) {
      return NextResponse.json({ success: true, category: existingCategory })
    }

    // Create "Uncategorized" category
    const { data: newCategory, error } = await supabase
      .from("categories")
      .insert({
        user_id: session.user.id,
        name: "Uncategorized",
        description: "Emails that haven't been categorized yet",
        color: "#6B7280",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating uncategorized category:", error)
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    return NextResponse.json({ success: true, category: newCategory })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
