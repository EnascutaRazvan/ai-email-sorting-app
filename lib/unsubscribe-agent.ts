import puppeteer from "puppeteer"

interface UnsubscribeLink {
  url: string
  text: string
  method: string
}

interface UnsubscribeResult {
  success: boolean
  method: string
  error?: string
  details?: string
  screenshot?: string
}

interface EmailUnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: Array<{
    link: UnsubscribeLink
    result: UnsubscribeResult
  }>
}

export class UnsubscribeAgent {
  private browser: puppeteer.Browser | null = null

  async initialize() {
    this.browser = await puppeteer.launch({
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
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private extractUnsubscribeLinks(emailContent: string): UnsubscribeLink[] {
    const links: UnsubscribeLink[] = []

    // Common unsubscribe patterns
    const patterns = [
      /href=["']([^"']*unsubscribe[^"']*)["'][^>]*>([^<]*)/gi,
      /href=["']([^"']*opt[_-]?out[^"']*)["'][^>]*>([^<]*)/gi,
      /href=["']([^"']*remove[^"']*)["'][^>]*>([^<]*)/gi,
      /href=["']([^"']*preferences[^"']*)["'][^>]*>([^<]*)/gi,
    ]

    patterns.forEach((pattern) => {
      let match
      while ((match = pattern.exec(emailContent)) !== null) {
        const url = match[1]
        const text = match[2]?.trim() || "Unsubscribe"

        if (url && !links.some((link) => link.url === url)) {
          links.push({
            url: url.startsWith("http") ? url : `https:${url}`,
            text,
            method: "GET",
          })
        }
      }
    })

    // Look for List-Unsubscribe headers in email content
    const listUnsubscribeMatch = emailContent.match(/List-Unsubscribe:\s*<([^>]+)>/i)
    if (listUnsubscribeMatch) {
      const url = listUnsubscribeMatch[1]
      if (!links.some((link) => link.url === url)) {
        links.push({
          url,
          text: "List-Unsubscribe",
          method: url.startsWith("mailto:") ? "EMAIL" : "GET",
        })
      }
    }

    return links
  }

  private async attemptUnsubscribe(link: UnsubscribeLink): Promise<UnsubscribeResult> {
    if (!this.browser) {
      throw new Error("Browser not initialized")
    }

    const page = await this.browser.newPage()

    try {
      // Set user agent and viewport
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      )
      await page.setViewport({ width: 1280, height: 720 })

      if (link.method === "EMAIL") {
        return {
          success: false,
          method: "EMAIL",
          error: "Email unsubscribe not supported",
          details: "Mailto links require manual intervention",
        }
      }

      // Navigate to the unsubscribe page with timeout and error handling
      const navigationPromise = page.goto(link.url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      })

      // Race condition to handle potential page redirects or new windows
      await Promise.race([navigationPromise, new Promise((resolve) => setTimeout(resolve, 5000))])

      // Wait a bit for content to load
      await page.waitForTimeout(2000)

      // Take a screenshot for debugging
      const screenshot = await page.screenshot({
        encoding: "base64",
        fullPage: false,
      })

      // Look for common unsubscribe elements
      const unsubscribeSelectors = [
        'button[type="submit"]:contains("unsubscribe")',
        'input[type="submit"][value*="unsubscribe"]',
        'a[href*="unsubscribe"]',
        'button:contains("unsubscribe")',
        'button:contains("remove")',
        'button:contains("opt out")',
        ".unsubscribe-button",
        "#unsubscribe",
        '[data-testid*="unsubscribe"]',
      ]

      let clicked = false
      for (const selector of unsubscribeSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            await element.click()
            clicked = true
            break
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!clicked) {
        // Try to find any form and submit it
        const forms = await page.$$("form")
        if (forms.length > 0) {
          const form = forms[0]
          await form.evaluate((form: HTMLFormElement) => form.submit())
          clicked = true
        }
      }

      if (clicked) {
        // Wait for potential redirect or confirmation
        await page.waitForTimeout(3000)

        const finalUrl = page.url()
        const pageContent = await page.content()

        // Check for success indicators
        const successIndicators = ["unsubscribed", "removed", "opt out", "successfully", "confirmation", "thank you"]

        const hasSuccessIndicator = successIndicators.some((indicator) => pageContent.toLowerCase().includes(indicator))

        return {
          success: hasSuccessIndicator,
          method: "FORM_SUBMIT",
          details: `Clicked unsubscribe element. Final URL: ${finalUrl}`,
          screenshot: `data:image/png;base64,${screenshot}`,
        }
      } else {
        return {
          success: false,
          method: "MANUAL_REQUIRED",
          error: "No unsubscribe button found",
          details: "Page requires manual intervention",
          screenshot: `data:image/png;base64,${screenshot}`,
        }
      }
    } catch (error: any) {
      const screenshot = await page
        .screenshot({
          encoding: "base64",
          fullPage: false,
        })
        .catch(() => null)

      return {
        success: false,
        method: "ERROR",
        error: error.message,
        details: `Failed to process unsubscribe link: ${link.url}`,
        screenshot: screenshot ? `data:image/png;base64,${screenshot}` : undefined,
      }
    } finally {
      await page.close().catch(() => {})
    }
  }

  async processEmail(
    emailId: string,
    subject: string,
    sender: string,
    content: string,
  ): Promise<EmailUnsubscribeResult> {
    const links = this.extractUnsubscribeLinks(content)
    const results: Array<{ link: UnsubscribeLink; result: UnsubscribeResult }> = []

    if (links.length === 0) {
      return {
        emailId,
        subject,
        sender,
        success: false,
        summary: "No unsubscribe links found",
        details: [],
      }
    }

    // Process each unsubscribe link
    for (const link of links) {
      try {
        const result = await this.attemptUnsubscribe(link)
        results.push({ link, result })

        // If we successfully unsubscribed, we can stop
        if (result.success) {
          break
        }
      } catch (error: any) {
        results.push({
          link,
          result: {
            success: false,
            method: "ERROR",
            error: error.message,
            details: "Failed to process unsubscribe link",
          },
        })
      }
    }

    const hasSuccess = results.some((r) => r.result.success)
    const summary = hasSuccess ? "Successfully unsubscribed" : `Failed to unsubscribe. Tried ${results.length} link(s).`

    return {
      emailId,
      subject,
      sender,
      success: hasSuccess,
      summary,
      details: results,
    }
  }

  async processEmails(emails: Array<{ id: string; subject: string; sender: string; content: string }>): Promise<{
    results: EmailUnsubscribeResult[]
    totalProcessed: number
    totalSuccessful: number
  }> {
    const results: EmailUnsubscribeResult[] = []

    try {
      await this.initialize()

      for (const email of emails) {
        const result = await this.processEmail(email.id, email.subject, email.sender, email.content)
        results.push(result)
      }
    } finally {
      await this.close()
    }

    const totalSuccessful = results.filter((r) => r.success).length

    return {
      results,
      totalProcessed: results.length,
      totalSuccessful,
    }
  }
}
