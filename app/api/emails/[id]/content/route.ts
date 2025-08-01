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

    // Fetch email with all details
    const { data: email, error } = await supabase
      .from("emails")
      .select(`
        *,
        categories(id, name, color),
        user_accounts(email, name)
      `)
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .single()

    if (error || !email) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 })
    }

    // Mark email as read if it wasn't already
    if (!email.is_read) {
      await supabase.from("emails").update({ is_read: true }).eq("id", emailId).eq("user_id", session.user.id)
    }

    // Format the response
    const formattedEmail = {
      id: email.id,
      subject: email.subject,
      sender: email.sender,
      snippet: email.snippet,
      ai_summary: email.ai_summary,
      email_body: email.email_body,
      received_at: email.received_at,
      is_read: true, // Mark as read since we just read it
      category: email.categories
        ? {
            id: email.categories.id,
            name: email.categories.name,
            color: email.categories.color,
          }
        : null,
      account: email.user_accounts
        ? {
            email: email.user_accounts.email,
            name: email.user_accounts.name,
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      email: formattedEmail,
    })
  } catch (error) {
    console.error("Error fetching email content:", error)
    return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 })
  }
}
