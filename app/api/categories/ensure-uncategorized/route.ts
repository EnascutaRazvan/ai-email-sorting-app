import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const userId = session.user.id

  try {
    // Check if 'Uncategorized' category already exists for the user
    const { data: existingCategory, error: fetchError } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("name", "Uncategorized")
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means no rows found, which is expected if it doesn't exist
      console.error("Error checking for existing 'Uncategorized' category:", fetchError)
      throw new Error("Database error checking category")
    }

    if (existingCategory) {
      return NextResponse.json({ message: "Uncategorized category already exists", categoryId: existingCategory.id })
    }

    // If not found, create it
    const { data: newCategory, error: insertError } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: "Uncategorized",
        color: "#9CA3AF", // Default gray color
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error creating 'Uncategorized' category:", insertError)
      throw new Error("Database error creating category")
    }

    return NextResponse.json({ message: "Uncategorized category created", categoryId: newCategory.id })
  } catch (error: any) {
    console.error("Failed to ensure uncategorized category:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
