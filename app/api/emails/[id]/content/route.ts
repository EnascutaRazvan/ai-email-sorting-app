import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { google } from "googleapis"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Helper to refresh Google access token
async function refreshGoogleAccessToken(refreshToken: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials.access_token
  } catch (error) {
    console.error("Error refreshing Google access token:", error)
    return null
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const emailId = params.id

    // 1. Fetch email details from Supabase to get account_id and is_read status
    const { data: email, error: emailError } = await supabase
      .from("emails")
      .select("id, account_id, is_read, full_content")
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .single()

    if (emailError || !email) {
      console.error("Error fetching email from DB:", emailError)
      return NextResponse.json({ error: "Email not found or unauthorized" }, { status: 404 })
    }

    // If full_content is already available, return it
    if (email.full_content) {
      // Mark as read if not already
      if (!email.is_read) {
        await supabase.from("emails").update({ is_read: true }).eq("id", emailId)
      }
      return NextResponse.json({ success: true, content: email.full_content })
    }

    // 2. If full_content is not in DB, fetch account details to get access token
    const { data: account, error: accountError } = await supabase
      .from("user_accounts")
      .select("access_token, refresh_token, expires_at")
      .eq("id", email.account_id)
      .eq("user_id", session.user.id)
      .single()

    if (accountError || !account) {
      console.error("Error fetching account for email content:", accountError)
      return NextResponse.json({ error: "Account not found or unauthorized" }, { status: 404 })
    }

    let currentAccessToken = account.access_token
    // Check if token is expired or about to expire (e.g., within 5 minutes)
    const expiresAtDate = new Date(account.expires_at)
    if (expiresAtDate.getTime() < Date.now() + 5 * 60 * 1000) {
      console.log(`Refreshing token for account: ${email.account_id}`)
      const newAccessToken = await refreshGoogleAccessToken(account.refresh_token!)
      if (newAccessToken) {
        currentAccessToken = newAccessToken
        // Update the access token in Supabase
        await supabase
          .from("user_accounts")
          .update({ access_token: newAccessToken, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }) // Assuming 1 hour validity
          .eq("id", email.account_id)
      } else {
        console.error(`Failed to refresh token for account: ${email.account_id}. Cannot fetch email content.`)
        return NextResponse.json({ error: "Failed to refresh access token" }, { status: 500 })
      }
    }

    // 3. Use Gmail API to fetch full email content
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: currentAccessToken })
    const gmail = google.gmail({ version: "v1", auth: oauth2Client })

    const gmailResponse = await gmail.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    })

    const message = gmailResponse.data
    let fullContent = ""

    const getPartContent = (part: any): string => {
      if (part.body && part.body.data) {
        return Buffer.from(part.body.data, "base64").toString("utf8")
      }
      if (part.parts) {
        for (const p of part.parts) {
          const content = getPartContent(p)
          if (content) return content
        }
      }
      return ""
    }

    if (message.payload) {
      // Prioritize HTML content if available
      const htmlPart = message.payload.parts?.find((p: any) => p.mimeType === "text/html")
      if (htmlPart) {
        fullContent = getPartContent(htmlPart)
      } else {
        // Fallback to plain text
        const plainTextPart = message.payload.parts?.find((p: any) => p.mimeType === "text/plain")
        if (plainTextPart) {
          fullContent = getPartContent(plainTextPart)
        } else if (message.payload.body?.data) {
          // If no parts, check main body
          fullContent = Buffer.from(message.payload.body.data, "base64").toString("utf8")
        }
      }
    }

    // 4. Update the email in Supabase with the full content and mark as read
    await supabase.from("emails").update({ full_content: fullContent, is_read: true }).eq("id", emailId)

    return NextResponse.json({ success: true, content: fullContent })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const emailId = params.id
    const { category_id, is_read } = await request.json()

    const updateData: { category_id?: string | null; is_read?: boolean } = {}
    if (category_id !== undefined) {
      updateData.category_id = category_id
    }
    if (is_read !== undefined) {
      updateData.is_read = is_read
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No update data provided" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("emails")
      .update(updateData)
      .eq("id", emailId)
      .eq("user_id", session.user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating email:", error)
      return NextResponse.json({ error: "Failed to update email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
