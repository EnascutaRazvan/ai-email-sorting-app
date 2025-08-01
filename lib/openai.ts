import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export interface EmailCategorizationResult {
  category: string
  confidence: number
  summary: string
  reasoning: string
}

export interface Category {
  id: string
  name: string
  description: string
}

export async function categorizeEmail(
  emailSubject: string,
  emailBody: string,
  categories: Category[],
): Promise<EmailCategorizationResult> {
  try {
    const categoriesText = categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const prompt = `
You are an AI email categorization assistant. Analyze the following email and categorize it based on the available categories.

Available Categories:
${categoriesText}

Email Subject: ${emailSubject}
Email Body: ${emailBody.substring(0, 2000)}...

Please respond with a JSON object containing:
- category: The most appropriate category name (must match exactly one from the list above)
- confidence: A number between 0-1 indicating how confident you are
- summary: A 1-2 sentence summary of the email content
- reasoning: Brief explanation of why this category was chosen

If none of the categories fit well, use "Uncategorized" as the category name.
`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"), // Using mini version for cost efficiency
      prompt,
      temperature: 0.3, // Lower temperature for more consistent categorization
    })

    // Parse the JSON response
    const result = JSON.parse(text) as EmailCategorizationResult

    // Validate the result
    if (!result.category || !result.summary) {
      throw new Error("Invalid AI response format")
    }

    // Ensure confidence is between 0 and 1
    result.confidence = Math.max(0, Math.min(1, result.confidence || 0.5))

    return result
  } catch (error) {
    console.error("Error categorizing email:", error)

    // Fallback response
    return {
      category: "Uncategorized",
      confidence: 0.1,
      summary: `Email about: ${emailSubject}`,
      reasoning: "Failed to categorize due to AI processing error",
    }
  }
}

export async function summarizeEmail(emailSubject: string, emailBody: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `
Summarize this email in 1-2 clear, concise sentences. Focus on the main purpose and any action items.

Subject: ${emailSubject}
Body: ${emailBody.substring(0, 1500)}...

Summary:`,
      temperature: 0.3,
    })

    return text.trim()
  } catch (error) {
    console.error("Error summarizing email:", error)
    return `Email about: ${emailSubject}`
  }
}
