// lib/server/unsubscribe-agent.ts

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { chromium, Browser } from "playwright"

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
  screenshot?: string
}

export class UnsubscribeAgent {
  private model = groq("llama-3.3-70b-versatile")

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
        return Array.isArray(JSON.parse(text)) ? JSON.parse(text) : []
      } catch {
        return this.fallbackLinkExtraction(emailContent)
      }
    } catch {
      return this.fallbackLinkExtraction(emailContent)
    }
  }

  private fallbackLinkExtraction(emailContent: string): UnsubscribeLink[] {
    const links: UnsubscribeLink[] = []
    const patterns = [
      /https?:\/\/[^\s<>"]+unsubscribe[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+opt-out[^\s<>"]*/gi,
      /https?:\/\/[^\s<>"]+remove[^\s<>"]*/gi,
      /mailto:[^\s<>"]+\?subject=[^\s<>"]*unsubscribe[^\s<>"]*/gi,
    ]

    for (const pattern of patterns) {
      const matches = emailContent.match(pattern)
      if (matches) {
        for (const url of matches) {
          links.push({ url, text: "Unsubscribe", method: "GET" })
        }
      }
    }

    return links
  }

  async processUnsubscribe(link: UnsubscribeLink): Promise<UnsubscribeResult> {
    let browser: Browser | null = null

    try {
      if (link.url.startsWith("mailto:")) {
        return {
          success: true,
          method: "mailto",
          details: `Unsubscribe email would be sent to: ${link.url}`,
        }
      }

      browser = await chromium.launch({ headless: true })
      const context = await browser.newContext()
      const page = await context.newPage()

      await page.goto(link.url, { waitUntil: "networkidle", timeout: 30000 })

      const screenshot = await page.screenshot({ type: "png", fullPage: true })
      const pageText = await page.content()

      const { text: analysisText } = await generateText({
        model: this.model,
        prompt: `
          You are an AI agent helping to unsubscribe from an email list. 
          
          Page URL: ${link.url}
          Page text content: ${pageText.substring(0, 2000)}
          
          Analyze this unsubscribe page and determine what actions need to be taken:
          1. Is this a simple confirmation page that just needs a button click?
          2. Does it require filling out a form?
          3. Are there checkboxes or dropdowns to interact with?
          4. Is there a CAPTCHA present?
          5. Does it require email confirmation?
          
          Look for elements like:
          - "Confirm unsubscribe" buttons
          - "Unsubscribe" buttons
          - Email input fields
          - Reason dropdowns/checkboxes
          - Submit buttons
          
          Respond with just a JSON object, without any other plain text, without formatting, backticks, just the JSON:
          {
            "action": "CLICK_BUTTON|FILL_FORM|EMAIL_CONFIRMATION|CAPTCHA_REQUIRED|ALREADY_UNSUBSCRIBED|ERROR",
            "elements": [
              {
                "type": "button|input|select|checkbox",
                "selector": "CSS selector or text to find element",
                "action": "click|type|select",
                "value": "value to enter if needed"
              }
            ],
            "confidence": 0.0-1.0,
            "message": "description of what was found and what needs to be done"
          }
        `,
      })

      console.log(analysisText);
      let analysis

      try {
        analysis = JSON.parse(analysisText)
      } catch {
        return { success: false, method: "ERROR", error: "Invalid AI response" }
      }

      let success = false
      let details = analysis.message

      if (analysis.action === "ALREADY_UNSUBSCRIBED") {
        success = true
      } else if (analysis.elements?.length) {
        for (const el of analysis.elements) {
          try {
            if (el.action === "click") {
              await page.click(el.selector)
            } else if (el.action === "type") {
              await page.fill(el.selector, el.value)
            } else if (el.action === "select") {
              await page.selectOption(el.selector, el.value)
            }
          } catch (err) {
            console.error("Action failed:", err)
          }
        }

        success = true
        details = "Actions executed based on AI instructions"
      }

      return {
        success,
        method: analysis.action,
        details,
        screenshot: `data:image/png;base64,${screenshot.toString("base64")}`,
      }
    } catch (err) {
      return {
        success: false,
        method: "ERROR",
        error: (err as Error).message,
      }
    } finally {
      if (browser) await browser.close()
    }
  }

  async unsubscribeFromEmail(emailContent: string): Promise<{
    success: boolean
    results: Array<{ link: UnsubscribeLink; result: UnsubscribeResult }>
    summary: string
  }> {
    const links = await this.extractUnsubscribeLinks(emailContent)
    const results = []
    let successCount = 0

    for (const link of links) {
      const result = await this.processUnsubscribe(link)
      results.push({ link, result })
      if (result.success) successCount++
    }

    return {
      success: successCount > 0,
      results,
      summary: `Processed ${links.length} unsubscribe links, ${successCount} successful`,
    }
  }
}
