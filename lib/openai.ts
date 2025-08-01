import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface EmailCategorizationResult {
  category: string
  summary: string
  confidence: number
}

export async function categorizeAndSummarizeEmail(
  subject: string,
  snippet: string,
  sender: string,
  categories: Array<{ name: string; description: string }>,
): Promise<EmailCategorizationResult> {
  try {
    const categoryDescriptions = categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const prompt = `
You are an AI email assistant. Analyze the following email and:
1. Categorize it based on the available categories
2. Provide a 1-2 sentence summary
3. Rate your confidence (0-100)

Email Details:
- Subject: ${subject}
- From: ${sender}
- Preview: ${snippet}

Available Categories:
${categoryDescriptions}

If none of the categories fit well, use "Uncategorized".

Respond in JSON format:
{
  "category": "category_name",
  "summary": "brief summary",
  "confidence": 85
}
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the more cost-effective model
      messages: [
        {
          role: "system",
          content: "You are a helpful email categorization assistant. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    const result = JSON.parse(response) as EmailCategorizationResult

    // Validate the response
    if (!result.category || !result.summary || typeof result.confidence !== "number") {
      throw new Error("Invalid response format from OpenAI")
    }

    return result
  } catch (error) {
    console.error("Error categorizing email:", error)
    // Fallback response
    return {
      category: "Uncategorized",
      summary: `Email from ${sender}: ${subject}`,
      confidence: 0,
    }
  }
}
