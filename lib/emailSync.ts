// lib/emailSync.ts

import { createClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { htmlToText } from "html-to-text"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface GmailMessage {
    id: string
    threadId: string
    labelIds: string[]
    snippet: string
    payload: {
        headers: Array<{ name: string; value: string }>
        body?: { data?: string }
        parts?: Array<{ body?: { data?: string }; mimeType?: string }>
    }
    internalDate: string
}



async function buildDateQuery(accountId: string, userId: string, isScheduled: boolean): Promise<string> {
    const { data: account } = await supabase
        .from("user_accounts")
        .select("last_sync, created_at")
        .eq("id", accountId)
        .single()

    if (!account) return ""

    let afterDate = isScheduled && account.last_sync
        ? new Date(account.last_sync)
        : new Date(account.created_at)

    const formattedDate = afterDate.toISOString().split("T")[0].replace(/-/g, "/")
    return `after:${formattedDate}`
}

function extractEmailBody(payload: any): { html: string; clean: string } {
    let htmlBody = ""

    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/html" && part.body?.data) {
                htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8")
                break
            }
        }

        if (!htmlBody) {
            for (const part of payload.parts) {
                if (part.mimeType === "text/plain" && part.body?.data) {
                    htmlBody = Buffer.from(part.body.data, "base64").toString("utf-8")
                    break
                }
            }
        }
    }

    if (!htmlBody && payload.body?.data) {
        htmlBody = Buffer.from(payload.body.data, "base64").toString("utf-8")
    }

    const cleanText = cleanHtmlToText(htmlBody || "")

    return {
        html: htmlBody || "No content available",
        clean: cleanText || "No plain text available",
    }
}

async function generateEmailSummary(subject: string, from: string, htmlBody: string): Promise<string> {
    try {
        const plainTextBody = cleanHtmlToText(htmlBody)
        const prompt = `Summarize the following email. Focus on core message and any required action.\n\nSubject: ${subject}\nFrom: ${from}\n\nBody:\n${plainTextBody.substring(0, 2000)}\n\nSummary:`

        const { text } = await generateText({
            model: groq("llama-3.1-8b-instant"),
            prompt,
            maxTokens: 100,
        })

        return text.trim()
    } catch (error) {
        return "Unable to generate summary"
    }
}

async function categorizeEmailWithAI(subject: string, from: string, body: string, categories: any[]): Promise<string | null> {
    if (!categories.length) return null

    const categoryList = categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const { text } = await generateText({
        model: groq("llama-3.1-8b-instant"),
        prompt: `Categorize this email from the list. Return ONLY the category name.\n\nAvailable Categories:\n${categoryList}\n\nEmail:\nSubject: ${subject}\nFrom: ${from}\nBody: ${body.substring(0, 1000)}...\n\nCategory:`,
        maxTokens: 20,
    })

    const match = categories.find((cat) =>
        cat.name.toLowerCase().includes(text.trim().toLowerCase()) ||
        text.trim().toLowerCase().includes(cat.name.toLowerCase())
    )

    return match?.id || null
}

async function archiveEmailInGmail(messageId: string, accessToken: string): Promise<void> {
    try {
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                removeLabelIds: ["INBOX"],
            }),
        })
    } catch { }
}

function cleanHtmlToText(html: string): string {
    return htmlToText(html, {
        wordwrap: 130,
        selectors: [
            { selector: "a", options: { ignoreHref: true } },
            { selector: "img", format: "skip" },
        ],
    })
}
async function fetchWithRefresh(account: any, url: string): Promise<Response> {
    const makeRequest = async (token: string) => {
        return await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
    }

    let response = await makeRequest(account.access_token)

    if (response.status === 401 && account.refresh_token) {
        console.warn(`Access token expired for ${account.email}, attempting refresh...`)

        const refreshed = await refreshAccessToken(account.refresh_token)

        if (refreshed?.access_token) {
            account.access_token = refreshed.access_token

            // Save new token to DB
            await supabase
                .from("user_accounts")
                .update({ access_token: refreshed.access_token, updated_at: new Date().toISOString() })
                .eq("id", account.id)

            // Retry the request
            response = await makeRequest(account.access_token)
        } else {
            console.error(`Failed to refresh token for ${account.email}`)
        }
    }

    return response
}

async function refreshAccessToken(refresh_token: string): Promise<{ access_token?: string }> {
    try {
        const params = new URLSearchParams()
        params.append("client_id", process.env.GOOGLE_CLIENT_ID!)
        params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET!)
        params.append("refresh_token", refresh_token)
        params.append("grant_type", "refresh_token")

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error("Google token refresh error:", data)
            return {}
        }

        console.log("New access token issued:", data.access_token.slice(0, 10) + "...")

        return data
    } catch (err) {
        console.error("Token refresh failed:", err)
        return {}
    }
}

export async function importEmailsForAccount({
    account,
    userId,
    isScheduled = false,
    categories,
}: {
    account: any
    userId: string
    isScheduled?: boolean
    categories?: any[]
}): Promise<{ imported: number; processed: number }> {
    const dateQuery = await buildDateQuery(account.id, userId, isScheduled)

    const gmailQuery = `in:inbox -in:sent ${dateQuery}`
    const gmailResponse = await fetchWithRefresh(
        account,
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=100`
    )


    if (!gmailResponse.ok) {
        console.error("Gmail API error:", await gmailResponse.text())
        return { imported: 0, processed: 0 }
    }

    const gmailData = await gmailResponse.json()
    const messageIds = gmailData.messages || []

    let importedCount = 0
    let processedCount = 0

    // If categories are not passed (e.g., from cron), fetch them here
    if (!categories) {
        const { data: fetchedCategories } = await supabase
            .from("categories")
            .select("*")
            .eq("user_id", userId)

        categories = fetchedCategories || []
    }

    for (const messageRef of messageIds) {
        try {
            processedCount++

            const { data: existingEmail } = await supabase
                .from("emails")
                .select("id")
                .eq("id", messageRef.id)
                .single()

            if (existingEmail) continue

            const messageResponse = await fetchWithRefresh(
                account,
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`
            )


            if (!messageResponse.ok) continue

            const message: GmailMessage = await messageResponse.json()

            const headers = message.payload.headers
            const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject"
            const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender"
            const date = new Date(Number.parseInt(message.internalDate))

            const { html: emailBody, clean: cleanEmailBody } = extractEmailBody(message.payload)

            const aiSummary = await generateEmailSummary(subject, from, emailBody)
            const categoryId = await categorizeEmailWithAI(subject, from, emailBody, categories)

            const { error: insertError } = await supabase.from("emails").insert({
                id: message.id,
                user_id: userId,
                account_id: account.id,
                category_id: categoryId,
                subject,
                sender: from,
                snippet: message.snippet,
                ai_summary: aiSummary,
                received_at: date.toISOString(),
                is_read: !message.labelIds.includes("UNREAD"),
                gmail_thread_id: message.threadId,
                email_body: emailBody,
                clean_email_body: cleanEmailBody,
            })

            if (insertError) continue

            await archiveEmailInGmail(message.id, account.access_token)

            importedCount++
        } catch (err) {
            console.error("Email import error:", err)
        }
    }

    await supabase
        .from("user_accounts")
        .update({
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)

    return { imported: importedCount, processed: processedCount }
}

