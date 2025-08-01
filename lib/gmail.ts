import { google } from "googleapis"
import type { OAuth2Client } from "google-auth-library"

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  body: string
  snippet: string
  date: Date
  labels: string[]
  isRead: boolean
}

export class GmailService {
  private oauth2Client: OAuth2Client

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + "/api/auth/callback/google",
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  }

  async getRecentEmails(maxResults = 50): Promise<GmailMessage[]> {
    try {
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client })

      // Get list of message IDs
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults,
        q: "in:inbox -in:trash", // Only inbox emails, not trash
      })

      if (!listResponse.data.messages) {
        return []
      }

      // Get full message details
      const messages: GmailMessage[] = []

      for (const message of listResponse.data.messages) {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
            format: "full",
          })

          const gmailMessage = this.parseGmailMessage(messageResponse.data)
          if (gmailMessage) {
            messages.push(gmailMessage)
          }
        } catch (error) {
          console.error(`Error fetching message ${message.id}:`, error)
          continue
        }
      }

      return messages
    } catch (error) {
      console.error("Error fetching Gmail messages:", error)
      throw new Error("Failed to fetch emails from Gmail")
    }
  }

  async archiveEmail(messageId: string): Promise<void> {
    try {
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client })

      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["INBOX"], // Remove from inbox (archives it)
        },
      })
    } catch (error) {
      console.error(`Error archiving email ${messageId}:`, error)
      throw new Error("Failed to archive email")
    }
  }

  async deleteEmail(messageId: string): Promise<void> {
    try {
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client })

      await gmail.users.messages.delete({
        userId: "me",
        id: messageId,
      })
    } catch (error) {
      console.error(`Error deleting email ${messageId}:`, error)
      throw new Error("Failed to delete email")
    }
  }

  private parseGmailMessage(data: any): GmailMessage | null {
    try {
      const headers = data.payload?.headers || []
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

      // Extract body content
      let body = ""
      if (data.payload?.body?.data) {
        body = Buffer.from(data.payload.body.data, "base64").toString("utf-8")
      } else if (data.payload?.parts) {
        // Multi-part message
        for (const part of data.payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8")
            break
          }
        }

        // If no plain text, try HTML
        if (!body) {
          for (const part of data.payload.parts) {
            if (part.mimeType === "text/html" && part.body?.data) {
              body = Buffer.from(part.body.data, "base64").toString("utf-8")
              // Strip HTML tags for basic text extraction
              body = body
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
              break
            }
          }
        }
      }

      // Check if email is read
      const isRead = !data.labelIds?.includes("UNREAD")

      return {
        id: data.id,
        threadId: data.threadId,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To"),
        body: body || data.snippet || "",
        snippet: data.snippet || "",
        date: new Date(Number.parseInt(data.internalDate)),
        labels: data.labelIds || [],
        isRead,
      }
    } catch (error) {
      console.error("Error parsing Gmail message:", error)
      return null
    }
  }
}
