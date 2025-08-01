import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const emailId = params.id

    // Fetch email content from database
    const { data: email, error } = await supabase
      .from("emails")
      .select(`
        *,
        categories (name, color),
        user_accounts (email)
      `)
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .single()

    if (error || !email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      email: {
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        body: email.email_body,
        summary: email.ai_summary,
        receivedAt: email.received_at,
        isRead: email.is_read,
        category: email.categories,
        account: email.user_accounts,
      },
    })
  } catch (error) {
    console.error("Error fetching email content:", error)
    return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 })
  }
}
