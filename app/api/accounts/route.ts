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

    const { data: accounts, error } = await supabase
      .from("user_accounts")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching accounts:", error)
      return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
    }

    return NextResponse.json({ success: true, accounts })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
