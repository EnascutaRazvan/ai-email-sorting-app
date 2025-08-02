import puppeteer from "puppeteer"
import { JSDOM } from "jsdom"

interface UnsubscribeResult {
  success: boolean
  summary: string
  details: string[]
  screenshot?: string // Base64 encoded screenshot
}

export class UnsubscribeAgent {
  private browser: puppeteer.Browser | null = null

  constructor() {
    // Initialize browser if needed, or do it on demand
  }

  private async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true, // Set to false for debugging UI
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    }
    return this.browser
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private extractUnsubscribeLink(htmlContent: string): string | null {
    const dom = new JSDOM(htmlContent)
    const document = dom.window.document

    // Try to find a direct unsubscribe link
    const unsubscribeLink = document.querySelector('a[href*="unsubscribe"], a[href*="optout"]') as HTMLAnchorElement
    if (unsubscribeLink) {
      return unsubscribeLink.href
    }

    // Look for list-unsubscribe header (common in email clients)
    const listUnsubscribeHeader = document.querySelector('meta[http-equiv="List-Unsubscribe"]') as HTMLMetaElement
    if (listUnsubscribeHeader) {
      const content = listUnsubscribeHeader.content
      const match = content.match(/<(https?:\/\/[^>]+)>/)
      if (match) {
        return match[1]
      }
    }

    // Fallback: search for text "unsubscribe" in links
    const links = document.querySelectorAll("a")
    for (const link of Array.from(links)) {
      if (
        link.textContent?.toLowerCase().includes("unsubscribe") ||
        link.textContent?.toLowerCase().includes("opt out")
      ) {
        return link.href
      }
    }

    return null
  }

  async processEmail(emailId: string, emailFullContent: string): Promise<UnsubscribeResult> {
    const details: string[] = []
    let screenshot: string | undefined

    try {
      const unsubscribeLink = this.extractUnsubscribeLink(emailFullContent)
      if (!unsubscribeLink) {
        details.push("No unsubscribe link found in email content.")
        return { success: false, summary: "No unsubscribe link found.", details }
      }

      details.push(`Found unsubscribe link: ${unsubscribeLink}`)

      const browser = await this.getBrowser()
      const page = await browser.newPage()
      await page.setViewport({ width: 1280, height: 800 })

      try {
        await page.goto(unsubscribeLink, { waitUntil: "domcontentloaded", timeout: 30000 })
        details.push(`Navigated to: ${page.url()}`)

        // Wait for a short period to allow dynamic content to load
        await page.waitForTimeout(2000)

        // Check for common unsubscribe patterns
        const pageContent = await page.content()
        const dom = new JSDOM(pageContent)
        const document = dom.window.document

        // Attempt 1: Look for a simple "Unsubscribe" button or link
        const unsubscribeButton = await page.$x(
          "//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'unsubscribe')] | //a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'unsubscribe')] | //input[contains(translate(@value, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'unsubscribe')]",
        )
        if (unsubscribeButton.length > 0) {
          details.push("Found unsubscribe button/link. Clicking...")
          await unsubscribeButton[0].click()
          await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {
            /* ignore navigation timeout */
          })
          details.push(`Clicked unsubscribe. Current URL: ${page.url()}`)
          screenshot = (await page.screenshot({ encoding: "base64" })) as string
          return { success: true, summary: "Successfully clicked unsubscribe button/link.", details, screenshot }
        }

        // Attempt 2: Look for forms with "unsubscribe" or "opt-out" in action/name/id
        const form = await page.$(
          'form[action*="unsubscribe"], form[action*="optout"], form[id*="unsubscribe"], form[name*="unsubscribe"]',
        )
        if (form) {
          details.push("Found a potential unsubscribe form.")
          const emailInput = await form.$('input[type="email"], input[name*="email"], input[id*="email"]')
          if (emailInput) {
            details.push("Found email input. Attempting to fill with sender email (if available).")
            // You might need to pass the sender's email to this function
            // For now, we'll assume the form might not need it or it's pre-filled
            // await emailInput.type(senderEmail); // Requires senderEmail to be passed
          }

          const submitButton = await form.$('button[type="submit"], input[type="submit"]')
          if (submitButton) {
            details.push("Found submit button. Clicking form...")
            await submitButton.click()
            await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {
              /* ignore navigation timeout */
            })
            details.push(`Submitted form. Current URL: ${page.url()}`)
            screenshot = (await page.screenshot({ encoding: "base64" })) as string
            return { success: true, summary: "Successfully submitted unsubscribe form.", details, screenshot }
          }
        }

        // Attempt 3: Check for confirmation messages on the page
        const pageText = await page.evaluate(() => document.body.innerText)
        if (
          pageText.toLowerCase().includes("you have been unsubscribed") ||
          pageText.toLowerCase().includes("successfully unsubscribed") ||
          pageText.toLowerCase().includes("opted out") ||
          pageText.toLowerCase().includes("subscription cancelled")
        ) {
          details.push("Found confirmation message on page.")
          screenshot = (await page.screenshot({ encoding: "base64" })) as string
          return { success: true, summary: "Unsubscribe confirmed by page text.", details, screenshot }
        }

        details.push("No clear unsubscribe action or confirmation found on the page.")
        screenshot = (await page.screenshot({ encoding: "base64" })) as string
        return { success: false, summary: "Could not confirm unsubscribe. Manual review needed.", details, screenshot }
      } catch (pageError: any) {
        details.push(`Error during page interaction: ${pageError.message}`)
        screenshot = (await page.screenshot({ encoding: "base64" })) as string
        return { success: false, summary: `Failed to process unsubscribe: ${pageError.message}`, details, screenshot }
      } finally {
        await page.close()
      }
    } catch (error: any) {
      details.push(`General error: ${error.message}`)
      return { success: false, summary: `An unexpected error occurred: ${error.message}`, details }
    }
  }
}
