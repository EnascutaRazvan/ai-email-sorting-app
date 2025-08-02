import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq" // Using Groq as per first-class integrations

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "Invalid email IDs provided" }, { status: 400 })
    }

    const unsubscribedLinks: Array<{ emailId: string; link: string | null; error?: string }> = []

    for (const emailId of emailIds) {
      try {
        // Fetch the full email content
        const { data: email, error: fetchError } = await supabase
          .from("emails")
          .select("email_body")
          .eq("id", emailId)
          .eq("user_id", session.user.id)
          .single()

        if (fetchError || !email) {
          unsubscribedLinks.push({ emailId, link: null, error: "Email content not found" })
          continue
        }

        // Use AI SDK to extract the unsubscribe link
        const { text: extractedLink } = await generateText({
          model: groq("llama3-8b-8192"), // Using a Groq model
          prompt: `Extract the unsubscribe link from the following email body. If there are multiple, provide the most prominent one. If no clear unsubscribe link is found, respond with "NO_LINK".
          Email Body:
          ${email.email_body}`,
        })

        let link = null
        if (extractedLink && extractedLink !== "NO_LINK") {
          // Basic validation to ensure it looks like a URL
          try {
            new URL(extractedLink.trim())
            link = extractedLink.trim()
          } catch (e) {
            // Not a valid URL, treat as no link found
            link = null
          }
        }
        unsubscribedLinks.push({ emailId, link })
      } catch (aiError) {
        console.error(`AI extraction error for email ${emailId}:`, aiError)
        unsubscribedLinks.push({ emailId, link: null, error: "AI extraction failed" })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Unsubscribe link extraction processed.",
      unsubscribedLinks,
      note: "This process extracts unsubscribe links using AI. It does NOT automatically visit or interact with external websites to complete the unsubscribe action. You may need to visit the extracted links manually.",
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
