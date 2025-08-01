import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EmailCategorizationRequest {
  subject: string
  sender: string
  snippet: string
  categories: Array<{
    id: string
    name: string
    description: string
  }>
}

export interface EmailCategorizationResponse {
  categoryId: string | null
  confidence: number
  reasoning: string
  summary: string
}

export async function categorizeEmail(request: EmailCategorizationRequest): Promise<EmailCategorizationResponse> {
  try {
    const categoriesText = request.categories.map((cat) => `- ${cat.name}: ${cat.description}`).join("\n")

    const prompt = `You are an AI email categorization assistant. Analyze the following email and categorize it based on the available categories.

Email Details:
- Subject: ${request.subject}
- Sender: ${request.sender}
- Content Preview: ${request.snippet}

Available Categories:
${categoriesText}

Please respond with a JSON object containing:
1. categoryId: The ID of the most appropriate category (or null if none fit well)
2. confidence: A number between 0-1 indicating how confident you are in this categorization
3. reasoning: A brief explanation of why you chose this category
4. summary: A concise 1-2 sentence summary of the email's main purpose

Only categorize if you're at least 70% confident. If no category fits well, return null for categoryId.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error("No response from OpenAI")
    }

    // Parse the JSON response
    const result = JSON.parse(response) as EmailCategorizationResponse

    // Validate the response structure
    if (
      typeof result.confidence !== "number" ||
      typeof result.reasoning !== "string" ||
      typeof result.summary !== "string"
    ) {
      throw new Error("Invalid response structure from OpenAI")
    }

    return result
  } catch (error) {
    console.error("Error categorizing email with OpenAI:", error)

    // Return a fallback response
    return {
      categoryId: null,
      confidence: 0,
      reasoning: "Failed to categorize due to AI service error",
      summary: request.snippet.substring(0, 100) + "...",
    }
  }
}
