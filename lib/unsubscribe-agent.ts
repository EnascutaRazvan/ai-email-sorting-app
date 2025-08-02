import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import puppeteer from "puppeteer"

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
        const parsed = JSON.parse(text)
        return Array.isArray(parsed) ? parsed : []
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

      // Launch browser for actual web navigation
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
      })

      const page = await browser.newPage()

      try {
        // Set user agent to appear as a real browser
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        )

        // Navigate to the unsubscribe URL
        await page.goto(link.url, { waitUntil: "networkidle2", timeout: 30000 })

        // Take a screenshot for debugging
        const screenshot = await page.screenshot({ encoding: "base64" })

        // Get page content for AI analysis
        const pageContent = await page.content()
        const pageText = await page.evaluate(() => document.body.innerText)

        // Use AI to analyze the page and determine next steps
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
            
            Respond with a JSON object:
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

        let analysis
        try {
          analysis = JSON.parse(analysisText)
        } catch {
          analysis = {
            action: "ERROR",
            elements: [],
            confidence: 0,
            message: "Failed to parse AI analysis",
          }
        }

        // Execute the determined actions
        let success = false
        let details = analysis.message

        if (analysis.action === "ALREADY_UNSUBSCRIBED") {
          success = true
          details = "Already unsubscribed or email not found in list"
        } else if (analysis.action === "CLICK_BUTTON" && analysis.elements.length > 0) {
          // Try to find and click unsubscribe buttons
          for (const element of analysis.elements) {
            if (element.action === "click") {
              try {
                // Try different methods to find the element
                let elementHandle = null

                // Try by CSS selector first
                try {
                  elementHandle = await page.$(element.selector)
                } catch {}

                // If not found, try by text content
                if (!elementHandle) {
                  elementHandle = await page.evaluateHandle((text) => {
                    const elements = Array.from(document.querySelectorAll('button, input[type="submit"], a'))
                    return elements.find(
                      (el) =>
                        el.textContent?.toLowerCase().includes(text.toLowerCase()) ||
                        el.getAttribute("value")?.toLowerCase().includes(text.toLowerCase()),
                    )
                  }, element.selector)
                }

                if (elementHandle && elementHandle.asElement()) {
                  await elementHandle.asElement()!.click()
                  await page.waitForTimeout(2000) // Wait for any redirects
                  success = true
                  details = `Successfully clicked: ${element.selector}`
                  break
                }
              } catch (error) {
                console.error(`Error clicking element ${element.selector}:`, error)
              }
            }
          }
        } else if (analysis.action === "FILL_FORM" && analysis.elements.length > 0) {
          // Handle form filling
          for (const element of analysis.elements) {
            try {
              if (element.action === "type" && element.value) {
                await page.type(element.selector, element.value)
              } else if (element.action === "select" && element.value) {
                await page.select(element.selector, element.value)
              } else if (element.action === "click") {
                await page.click(element.selector)
              }
            } catch (error) {
              console.error(`Error interacting with element ${element.selector}:`, error)
            }
          }

          // Try to submit the form
          try {
            await page.click('input[type="submit"], button[type="submit"], button:contains("unsubscribe")')
            await page.waitForTimeout(3000)
            success = true
            details = "Form submitted successfully"
          } catch (error) {
            details = `Form filled but submission failed: ${error.message}`
          }
        } else if (analysis.action === "CAPTCHA_REQUIRED") {
          success = false
          details = "CAPTCHA detected - manual intervention required"
        } else if (analysis.action === "EMAIL_CONFIRMATION") {
          success = true
          details = "Email confirmation required - check email for confirmation link"
        }

        await browser.close()

        return {
          success,
          method: analysis.action,
          details,
          screenshot: `data:image/png;base64,${screenshot}`,
        }
      } catch (error) {
        await browser.close()
        return {
          success: false,
          method: "ERROR",
          error: `Navigation error: ${error.message}`,
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
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    return {
      success: successCount > 0,
      results,
      summary: `Processed ${links.length} unsubscribe links, ${successCount} successful`,
    }
  }
}
