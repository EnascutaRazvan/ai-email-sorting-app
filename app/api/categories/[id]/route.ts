import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { id } = params

  const { data: category, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 })
  }

  return NextResponse.json({ category })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { id } = params
  const { name, color } = await request.json()

  if (!name || !color) {
    return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
  }

  const { data: category, error } = await supabase
    .from("categories")
    .update({ name, color })
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select()
    .single()

  if (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { id } = params

  // Check if it's the 'Uncategorized' category
  const { data: category, error: fetchError } = await supabase
    .from("categories")
    .select("name")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single()

  if (fetchError || !category) {
    console.error("Error fetching category for deletion check:", fetchError)
    return NextResponse.json({ error: "Category not found or error fetching" }, { status: 404 })
  }

  if (category.name === "Uncategorized") {
    return NextResponse.json({ error: "Cannot delete the 'Uncategorized' category" }, { status: 400 })
  }

  // Find the 'Uncategorized' category ID for the current user
  const { data: uncategorizedCategory, error: uncategorizedError } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("name", "Uncategorized")
    .single()

  if (uncategorizedError || !uncategorizedCategory) {
    console.error("Error finding Uncategorized category:", uncategorizedError)
    return NextResponse.json({ error: "Uncategorized category not found for reassignment" }, { status: 500 })
  }

  // Reassign emails from the deleted category to 'Uncategorized'
  const { error: reassignError } = await supabase
    .from("emails")
    .update({ category_id: uncategorizedCategory.id })
    .eq("category_id", id)
    .eq("user_id", session.user.id)

  if (reassignError) {
    console.error("Error reassigning emails:", reassignError)
    return NextResponse.json({ error: reassignError.message }, { status: 500 })
  }

  // Delete the category
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", session.user.id)

  if (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: "Category deleted and emails reassigned successfully" })
}
