import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Function to categorize email content using AI
async function categorizeEmailWithAI(emailContent: string, userId: string): Promise<string | null> {
  try {
    // Fetch user's custom categories
    const { data: userCategories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)

    if (categoriesError) {
      console.error("Error fetching user categories for AI:", categoriesError)
      return null
    }

    const categoryNames = userCategories.map((cat) => cat.name).join(", ")
    const uncategorizedId = userCategories.find((cat) => cat.name === "Uncategorized")?.id || null

    const prompt = `Categorize the following email content into one of these categories: ${categoryNames}. If none of the categories fit, categorize it as "Uncategorized". Only respond with the category name.

Email content:
---
${emailContent}
---

Category:`

    const { text: categoryName } = await generateText({
      model: groq("llama3-8b-8192"), // Using Groq's Llama 3 8B model
      prompt: prompt,
      temperature: 0, // Keep it deterministic for categorization
    })

    const foundCategory = userCategories.find((cat) => cat.name.toLowerCase() === categoryName.trim().toLowerCase())

    return foundCategory ? foundCategory.id : uncategorizedId
  } catch (error) {
    console.error("Error categorizing email with AI:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json({ error: "Invalid or empty emailIds array" }, { status: 400 })
    }

    const updatedEmails = []

    for (const emailId of emailIds) {
      // Fetch email content for AI categorization
      const { data: email, error: fetchError } = await supabase
        .from("emails")
        .select("id, subject, snippet, full_content")
        .eq("id", emailId)
        .eq("user_id", session.user.id)
        .single()

      if (fetchError || !email) {
        console.error(`Error fetching email ${emailId} for recategorization:`, fetchError)
        continue
      }

      const contentToCategorize = `${email.subject} ${email.snippet} ${email.full_content?.substring(0, 500) || ""}`
      const newCategoryId = await categorizeEmailWithAI(contentToCategorize, session.user.id)

      if (newCategoryId) {
        const { data: updatedEmail, error: updateError } = await supabase
          .from("emails")
          .update({ category_id: newCategoryId, is_ai_suggested: true })
          .eq("id", emailId)
          .eq("user_id", session.user.id)
          .select("id, category_id")
          .single()

        if (updateError) {
          console.error(`Error updating category for email ${emailId}:`, updateError)
        } else if (updatedEmail) {
          updatedEmails.push(updatedEmail)
        }
      }
    }

    return NextResponse.json({ success: true, updatedEmails })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
