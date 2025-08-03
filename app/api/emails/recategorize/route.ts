import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailIds } = await request.json()

    if (!emailIds || !Array.isArray(emailIds)) {
      return NextResponse.json({ error: "Email IDs are required" }, { status: 400 })
    }

    // Get user categories
    const { data: categories } = await supabase.from("categories").select("*").eq("user_id", session.user.id)

    const uncategorizedCategory = categories?.find((c) => c.name.toLowerCase() === "uncategorized")


    if (!categories || categories.length === 0) {
      return NextResponse.json({ error: "No categories found" }, { status: 400 })
    }

    // Get emails to recategorize
    const { data: emails } = await supabase
      .from("emails")
      .select("id, subject, sender, snippet, email_body")
      .in("id", emailIds)
      .eq("user_id", session.user.id)

    if (!emails || emails.length === 0) {
      return NextResponse.json({ error: "No emails found" }, { status: 404 })
    }

    let updatedCount = 0
    const suggestions = []

    for (const email of emails) {
      try {
        const categoryId = await categorizeEmailWithAI(
          email.subject,
          email.sender,
          email.email_body || email.snippet,
          categories,
        )

        if (categoryId) {
          const { error: updateError } = await supabase
            .from("emails")
            .update({ category_id: categoryId })
            .eq("id", email.id)

          if (!updateError) {
            updatedCount++
            const category = categories.find((c) => c.id === categoryId)
            suggestions.push({
              emailId: email.id,
              categoryId,
              categoryName: category?.name,
              categoryColor: category?.color,
            })
          }
        }
      } catch (error) {
        console.error(`Error recategorizing email ${email.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      suggestions,
    })
  } catch (error) {
    console.error("Recategorization error:", error)
    return NextResponse.json({ error: "Failed to recategorize emails" }, { status: 500 })
  }
}

async function categorizeEmailWithAI(
  subject: string,
  sender: string,
  body: string,
  categories: any[],
): Promise<string | null> {
  if (!categories.length) return null

  try {
    const categoryList = categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `You are an email categorization assistant. Analyze the email and choose the most appropriate category from the list below. Respond with ONLY the category name, nothing else.

Available Categories:
${categoryList}

Email to categorize:
Subject: ${subject}
From: ${sender}
Body: ${body.substring(0, 1000)}...

Category:`,
      maxTokens: 20,
    })

    const selectedCategory = categories.find(
      (cat) =>
        cat.name.toLowerCase().includes(text.trim().toLowerCase()) ||
        text.trim().toLowerCase().includes(cat.name.toLowerCase()),
    )

    return selectedCategory?.id || null
  } catch (error) {
    console.error("Error categorizing email:", error)
    return null
  }
}
