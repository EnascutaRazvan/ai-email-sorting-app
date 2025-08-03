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

    // Get the email from database
    const { data: email, error } = await supabase
      .from("emails")
      .select(`
        *,
        user_accounts!inner(email, name),
        categories(name, color)
      `)
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .single()

    if (error || !email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // Mark email as read
    await supabase
      .from("emails")
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq("id", emailId)
      .eq("user_id", session.user.id)

    return NextResponse.json({
      success: true,
      email: {
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        received_at: email.received_at,
        ai_summary: email.ai_summary,
        email_body: email.email_body,
        clean_email_body: email.clean_email_body,
        is_read: true, // Update to read
        category: email.categories,
        account: email.user_accounts,
      },
    })
  } catch (error) {
    console.error("Error fetching email content:", error)
    return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 })
  }
}
