import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const userId = session.user.id

  // Ensure 'Uncategorized' category exists first
  await fetch(`${process.env.NEXTAUTH_URL}/api/categories/ensure-uncategorized`, {
    method: "POST",
    headers: {
      Cookie: request.headers.get("Cookie") || "", // Pass cookies for session
    },
  })

  // Fetch categories along with email counts
  const { data: categories, error } = await supabase
    .from("categories")
    .select(
      `
      id,
      name,
      color,
      emails(count)
    `,
    )
    .eq("user_id", userId)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const formattedCategories = categories.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    email_count: category.emails[0]?.count || 0,
  }))

  return NextResponse.json({ categories: formattedCategories })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient()
  const { name, color } = await request.json()

  if (!name || !color) {
    return NextResponse.json({ error: "Name and color are required" }, { status: 400 })
  }

  const { data: category, error } = await supabase
    .from("categories")
    .insert({ user_id: session.user.id, name, color })
    .select()
    .single()

  if (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category }, { status: 201 })
}
