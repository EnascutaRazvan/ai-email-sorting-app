import { google } from "googleapis"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export interface GmailEmail {
  id: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  receivedAt: Date
  isRead: boolean
}

export async function getGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + "/api/auth/callback/google",
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.gmail({ version: "v1", auth: oauth2Client })
}

export async function fetchNewEmails(
  accessToken: string,
  refreshToken: string,
  lastSyncTime?: Date,
): Promise<GmailEmail[]> {
  try {
    const gmail = await getGmailClient(accessToken, refreshToken)

    // Build query to get unread emails since last sync
    let query = "is:unread"
    if (lastSyncTime) {
      const timestamp = Math.floor(lastSyncTime.getTime() / 1000)
      query += ` after:${timestamp}`
    }

    // Get list of message IDs
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50, // Limit to avoid rate limits
    })

    if (!listResponse.data.messages) {
      return []
    }

    // Fetch full message details
    const emails: GmailEmail[] = []

    for (const message of listResponse.data.messages) {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: message.id!,
          format: "full",
        })

        const msg = messageResponse.data
        const headers = msg.payload?.headers || []

        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
        const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
        const date = headers.find((h) => h.name === "Date")?.value

        emails.push({
          id: msg.id!,
          threadId: msg.threadId!,
          subject,
          sender: from,
          snippet: msg.snippet || "",
          receivedAt: date ? new Date(date) : new Date(),
          isRead: !msg.labelIds?.includes("UNREAD"),
        })
      } catch (error) {
        console.error(`Error fetching message ${message.id}:`, error)
        continue
      }
    }

    return emails
  } catch (error) {
    console.error("Error fetching emails:", error)
    throw error
  }
}

export async function archiveEmail(accessToken: string, refreshToken: string, messageId: string): Promise<void> {
  try {
    const gmail = await getGmailClient(accessToken, refreshToken)

    await gmail.users.messages.modify({
      userId: "me",
      id: messageId,
      requestBody: {
        removeLabelIds: ["INBOX"],
      },
    })
  } catch (error) {
    console.error(`Error archiving email ${messageId}:`, error)
    throw error
  }
}

export async function deleteEmailFromGmail(
  accessToken: string,
  refreshToken: string,
  messageId: string,
): Promise<void> {
  try {
    const gmail = await getGmailClient(accessToken, refreshToken)

    await gmail.users.messages.delete({
      userId: "me",
      id: messageId,
    })
  } catch (error) {
    console.error(`Error deleting email ${messageId}:`, error)
    throw error
  }
}
