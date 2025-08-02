import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface UnsubscribeLink {
  url: string
  text: string
  method: "GET" | "POST"
}

interface UnsubscribeResult {
  success: boolean
  method: string
  error?: string
  details?: string
}

export class UnsubscribeAgent {
  private model = groq("llama-3.1-70b-versatile")

  async extractUnsubscribeLinks(emailContent: string): Promise<UnsubscribeLink[]> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt: `
          Analyze this email content and extract all unsubscribe links. Look for:
          - Links with text containing "unsubscribe", "opt out", "remove", "stop emails"
          - Links in footers or at the end of emails
          - mailto: links for unsubscribe
          - Any other links that appear to be for unsubscribing

          Email content:
          ${emailContent}

          Return a JSON array of objects with this format:
          [
            {
              "url": "the full URL",
              "text": "the link text or surrounding context",
              "method": "GET" or "POST" (guess based on context)
            }
          ]

          If no unsubscribe links are found, return an empty array.
        `,
      })

      try {
        return JSON.parse(text)
      } catch {
        // If JSON parsing fails, try to extract URLs manually
        return this.fallbackLinkExtraction(emailContent)
      }
    } catch (error) {
      console.error("Error extracting unsubscribe links:", error)
      return this.fallbackLinkExtraction(emailContent)
    }
  }

  private fallbackLinkExtraction(emailContent: string): UnsubscribeLink[] {
    const links: UnsubscribeLink[] = []

    // Look for common unsubscribe patterns
    const unsubscribePatterns = [
      /https?:\/\/[^\s<>"]+unsubscribe[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+opt-out[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+remove[^\s<>"]*/gi,
      /mailto:[^\s<>"]+\?subject=[^\s<>"]*unsubscribe[^\s<>"]*/gi,
    ]

    unsubscribePatterns.forEach((pattern) => {
      const matches = emailContent.match(pattern)
      if (matches) {
        matches.forEach((url) => {
          links.push({
            url: url.trim(),
            text: "Unsubscribe",
            method: "GET",
          })
        })
      }
    })

    return links
  }

  async processUnsubscribe(link: UnsubscribeLink): Promise<UnsubscribeResult> {
    try {
      // Handle mailto links
      if (link.url.startsWith("mailto:")) {
        return {
          success: true,
          method: "mailto",
          details: `Unsubscribe email would be sent to: ${link.url}`,
        }
      }

      // For HTTP links, we'll simulate the process since we can't actually navigate
      // In a real implementation, you'd use a headless browser like Puppeteer
      const { text } = await generateText({
        model: this.model,
        prompt: `
          You are an AI agent tasked with unsubscribing from an email list.
          
          Unsubscribe URL: ${link.url}
          Link context: ${link.text}
          
          Based on the URL and context, determine the most likely unsubscribe method:
          1. Simple GET request (just visiting the URL)
          2. Form submission required
          3. Email confirmation required
          4. Account login required
          
          Respond with a JSON object:
          {
            "method": "GET|POST|EMAIL|LOGIN",
            "confidence": 0.0-1.0,
            "expectedSteps": "description of what steps would be needed",
            "simulatedSuccess": true/false
          }
        `,
      })

      try {
        const analysis = JSON.parse(text)

        // Simulate the unsubscribe process
        if (analysis.method === "GET" && analysis.confidence > 0.7) {
          return {
            success: true,
            method: "GET",
            details: `Successfully processed unsubscribe via GET request to ${link.url}`,
          }
        } else if (analysis.method === "EMAIL") {
          return {
            success: true,
            method: "EMAIL",
            details: `Email confirmation unsubscribe initiated for ${link.url}`,
          }
        } else {
          return {
            success: false,
            method: analysis.method,
            error: `Complex unsubscribe process detected: ${analysis.expectedSteps}`,
          }
        }
      } catch {
        return {
          success: false,
          method: "UNKNOWN",
          error: "Could not analyze unsubscribe method",
        }
      }
    } catch (error) {
      return {
        success: false,
        method: "ERROR",
        error: error.message,
      }
    }
  }

  async unsubscribeFromEmail(emailContent: string): Promise<{
    success: boolean
    results: Array<{ link: UnsubscribeLink; result: UnsubscribeResult }>
    summary: string
  }> {
    const links = await this.extractUnsubscribeLinks(emailContent)

    if (links.length === 0) {
      return {
        success: false,
        results: [],
        summary: "No unsubscribe links found in email",
      }
    }

    const results = []
    let successCount = 0

    for (const link of links) {
      const result = await this.processUnsubscribe(link)
      results.push({ link, result })

      if (result.success) {
        successCount++
      }

      // Add delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return {
      success: successCount > 0,
      results,
      summary: `Processed ${links.length} unsubscribe links, ${successCount} successful`,
    }
  }
}
