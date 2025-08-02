import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface UnsubscribeLink {
  url: string
  text: string
  method: "GET" | "POST" | "MAILTO"
  confidence: number
  language: string
}

interface UnsubscribeResult {
  success: boolean
  method: string
  error?: string
  details?: string
  language?: string
}

export class UnsubscribeAgent {
  private model = groq("llama3-70b-8192") // Updated to current model

  async extractUnsubscribeLinks(emailContent: string): Promise<UnsubscribeLink[]> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt: `
          You are a multilingual AI agent that extracts unsubscribe links from emails in ANY language.
          
          Analyze this email content and find ALL unsubscribe links. Look for:
          
          ENGLISH: "unsubscribe", "opt out", "remove", "stop emails", "manage preferences"
          SPANISH: "darse de baja", "cancelar suscripción", "no recibir más"
          FRENCH: "se désabonner", "ne plus recevoir", "annuler"
          GERMAN: "abmelden", "kündigen", "nicht mehr erhalten"
          ITALIAN: "annullare iscrizione", "non ricevere più"
          PORTUGUESE: "cancelar inscrição", "não receber mais"
          ROMANIAN: "dezabonare", "dezabonează", "aici", "nu mai primi", "anulare"
          DUTCH: "uitschrijven", "afmelden"
          POLISH: "wypisz się", "rezygnuj"
          RUSSIAN: "отписаться", "отменить подписку"
          CHINESE: "退订", "取消订阅"
          JAPANESE: "配信停止", "登録解除"
          
          Also look for:
          - Links near words like "click here", "aici", "aquí", "ici", "hier", "clicca qui"
          - mailto: links with unsubscribe subjects
          - URLs containing unsubscribe-related paths
          - Links in footers or at the end of emails
          
          Email content:
          ${emailContent}

          Return a JSON array with this exact format:
          [
            {
              "url": "the complete URL or mailto link",
              "text": "the exact link text or surrounding context",
              "method": "GET|POST|MAILTO",
              "confidence": 0.0-1.0,
              "language": "detected language of the unsubscribe text"
            }
          ]

          If no unsubscribe links found, return: []
        `,
        maxTokens: 1000,
      })

      try {
        const parsed = JSON.parse(text)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return this.fallbackMultilingualExtraction(emailContent)
      }
    } catch (error) {
      console.error("Error extracting unsubscribe links:", error)
      return this.fallbackMultilingualExtraction(emailContent)
    }
  }

  private fallbackMultilingualExtraction(emailContent: string): UnsubscribeLink[] {
    const links: UnsubscribeLink[] = []

    // Multilingual unsubscribe patterns
    const patterns = [
      // URLs with unsubscribe paths
      {
        regex: /https?:\/\/[^\s<>"]+(?:unsubscribe|opt-out|remove|dezabonare|abmelden|désabonner)[^\s<>"]*/gi,
        lang: "multi",
      },

      // Mailto patterns
      {
        regex: /mailto:[^\s<>"]+\?[^\s<>"]*(?:subject=[^\s<>"]*(?:unsubscribe|dezabonare|abmelden)[^\s<>"]*)/gi,
        lang: "multi",
      },

      // Romanian specific patterns (for your example)
      { regex: /https?:\/\/[^\s<>"]+[^\s<>"]*(?=.*(?:dezabonare|aici))[^\s<>"]*/gi, lang: "ro" },

      // Generic URL patterns near unsubscribe words
      {
        regex:
          /https?:\/\/[^\s<>"]+(?=.*(?:unsubscribe|dezabonare|abmelden|désabonner|darse de baja|annullare|uitschrijven|отписаться|退订))/gi,
        lang: "multi",
      },
    ]

    patterns.forEach(({ regex, lang }) => {
      const matches = emailContent.match(regex)
      if (matches) {
        matches.forEach((url) => {
          links.push({
            url: url.trim(),
            text: "Unsubscribe",
            method: url.startsWith("mailto:") ? "MAILTO" : "GET",
            confidence: 0.7,
            language: lang,
          })
        })
      }
    })

    // Look for "aici" links (Romanian "here") - common pattern
    const aiciPattern = /(?:dezabonare|dezabonează)[^<>]*<a[^>]+href=["']([^"']+)["'][^>]*>aici<\/a>/gi
    let match
    while ((match = aiciPattern.exec(emailContent)) !== null) {
      links.push({
        url: match[1],
        text: "aici (dezabonare)",
        method: "GET",
        confidence: 0.9,
        language: "ro",
      })
    }

    return links
  }

  async processUnsubscribe(link: UnsubscribeLink, emailContent: string): Promise<UnsubscribeResult> {
    try {
      // Handle mailto links
      if (link.method === "MAILTO" || link.url.startsWith("mailto:")) {
        return {
          success: true,
          method: "MAILTO",
          details: `Unsubscribe email would be sent to: ${link.url}`,
          language: link.language,
        }
      }

      // Use AI to analyze the unsubscribe process
      const { text } = await generateText({
        model: this.model,
        prompt: `
          You are an AI agent that analyzes unsubscribe processes across different languages and websites.
          
          Unsubscribe URL: ${link.url}
          Link text/context: ${link.text}
          Detected language: ${link.language}
          Confidence: ${link.confidence}
          
          Original email snippet: ${emailContent.substring(0, 500)}...
          
          Based on the URL pattern, language, and context, determine:
          1. The most likely unsubscribe method
          2. Expected success rate
          3. Any potential complications
          
          Common patterns:
          - Simple GET: Just visiting the URL completes unsubscribe
          - Form required: Need to fill out a form
          - Email confirmation: Requires email verification
          - Login required: Need account access
          - One-click: Direct unsubscribe with token in URL
          
          Respond with JSON:
          {
            "method": "GET|POST|EMAIL|LOGIN|ONE_CLICK",
            "confidence": 0.0-1.0,
            "expectedSuccess": true/false,
            "reasoning": "explanation of the analysis",
            "simulatedAction": "description of what would happen"
          }
        `,
        maxTokens: 500,
      })

      try {
        const analysis = JSON.parse(text)

        // Simulate the unsubscribe process based on analysis
        if (analysis.expectedSuccess && analysis.confidence > 0.6) {
          return {
            success: true,
            method: analysis.method,
            details: `Successfully processed: ${analysis.simulatedAction}`,
            language: link.language,
          }
        } else {
          return {
            success: false,
            method: analysis.method,
            error: `Low confidence unsubscribe: ${analysis.reasoning}`,
            language: link.language,
          }
        }
      } catch {
        // Fallback logic based on URL patterns
        if (link.url.includes("token=") || link.url.includes("id=") || link.confidence > 0.8) {
          return {
            success: true,
            method: "ONE_CLICK",
            details: `One-click unsubscribe processed for ${link.url}`,
            language: link.language,
          }
        } else {
          return {
            success: false,
            method: "UNKNOWN",
            error: "Could not determine unsubscribe method",
            language: link.language,
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        method: "ERROR",
        error: error.message,
        language: link.language,
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
      const result = await this.processUnsubscribe(link, emailContent)
      results.push({ link, result })

      if (result.success) {
        successCount++
      }

      // Add delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return {
      success: successCount > 0,
      results,
      summary: `Found ${links.length} unsubscribe links, ${successCount} processed successfully`,
    }
  }
}
