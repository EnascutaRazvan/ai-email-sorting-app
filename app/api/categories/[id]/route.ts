import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const categoryId = params.id
    const { name, color } = await request.json()

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ name, color })
      .eq("id", categoryId)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating category:", error)
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }

    return NextResponse.json({ success: true, category: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const categoryId = params.id

    // Check if the category is "Uncategorized" or a default category that shouldn't be deleted
    const { data: category, error: fetchError } = await supabase
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .single()

    if (fetchError || !category) {
      console.error("Error fetching category for deletion check:", fetchError)
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    if (category.name === "Uncategorized" || ["Promotions", "Social", "Updates", "Forums"].includes(category.name)) {
      return NextResponse.json({ error: "Cannot delete default or system categories" }, { status: 403 })
    }

    // First, set emails associated with this category to null (uncategorized)
    const { error: updateEmailsError } = await supabase
      .from("emails")
      .update({ category_id: null })
      .eq("category_id", categoryId)
      .eq("user_id", session.user.id)

    if (updateEmailsError) {
      console.error("Error updating emails before category deletion:", updateEmailsError)
      return NextResponse.json({ error: "Failed to update associated emails" }, { status: 500 })
    }

    // Then, delete the category
    const { error } = await supabase.from("categories").delete().eq("id", categoryId).eq("user_id", session.user.id)

    if (error) {
      console.error("Error deleting category:", error)
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Category deleted successfully" })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
