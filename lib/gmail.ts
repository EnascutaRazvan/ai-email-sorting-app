import { google } from "googleapis"

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  receivedAt: Date
  isRead: boolean
  labels: string[]
}

export class GmailService {
  private gmail: any

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    this.gmail = google.gmail({ version: "v1", auth })
  }

  async getNewEmails(maxResults = 50): Promise<GmailMessage[]> {
    try {
      // Get messages from inbox that are not archived
      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: "in:inbox -label:processed-by-ai-sorter",
        maxResults,
      })

      const messages = response.data.messages || []
      const emailPromises = messages.map((msg: any) => this.getEmailDetails(msg.id))

      return Promise.all(emailPromises)
    } catch (error) {
      console.error("Error fetching emails from Gmail:", error)
      throw new Error("Failed to fetch emails from Gmail")
    }
  }

  private async getEmailDetails(messageId: string): Promise<GmailMessage> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      })

      const message = response.data
      const headers = message.payload.headers || []

      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

      const subject = getHeader("Subject")
      const sender = getHeader("From")
      const dateHeader = getHeader("Date")
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date()

      return {
        id: message.id,
        threadId: message.threadId,
        subject,
        sender,
        snippet: message.snippet || "",
        receivedAt,
        isRead: !message.labelIds?.includes("UNREAD"),
        labels: message.labelIds || [],
      }
    } catch (error) {
      console.error(`Error fetching email details for ${messageId}:`, error)
      throw error
    }
  }

  async archiveEmail(messageId: string): Promise<void> {
    try {
      // Remove from inbox and add our processing label
      await this.gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["INBOX"],
          addLabelIds: ["processed-by-ai-sorter"],
        },
      })
    } catch (error) {
      console.error(`Error archiving email ${messageId}:`, error)
      throw error
    }
  }

  async createLabelIfNotExists(labelName: string): Promise<string> {
    try {
      // First, try to find existing label
      const labelsResponse = await this.gmail.users.labels.list({
        userId: "me",
      })

      const existingLabel = labelsResponse.data.labels?.find((label: any) => label.name === labelName)

      if (existingLabel) {
        return existingLabel.id
      }

      // Create new label
      const createResponse = await this.gmail.users.labels.create({
        userId: "me",
        requestBody: {
          name: labelName,
          labelListVisibility: "labelShow",
          messageListVisibility: "show",
        },
      })

      return createResponse.data.id
    } catch (error) {
      console.error(`Error creating Gmail label ${labelName}:`, error)
      throw error
    }
  }
}
