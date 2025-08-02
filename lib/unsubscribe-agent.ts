import puppeteer, { type Browser, type Page } from "puppeteer"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

interface UnsubscribeLink {
  url: string
  text: string
  method: string // "GET" or "POST" or "MAILTO"
}

interface UnsubscribeResult {
  emailId: string
  subject: string
  sender: string
  success: boolean
  summary: string
  details: Array<{
    link: { url: string; text: string; method: string }
    result: {
      success: boolean
      method: string
      error?: string
      details?: string
      screenshot?: string
    }
  }>
}

export class UnsubscribeAgent {
  private browser: Browser | null = null
  private model = groq("llama-3.3-70b-versatile") // Using the specified private model

  constructor() {}

  private async initializeBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true, // Set to false for debugging UI
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    }
  }

  private async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async extractUnsubscribeLinks(htmlContent: string): Promise<UnsubscribeLink[]> {
    const links: UnsubscribeLink[] = []

    // Regex for mailto links
    const mailtoRegex =
      /<a[^>]*href=["']mailto:([^?"']+\?subject=[^"']*(?:&amp;|&)?body=[^"']*(?:unsubscribe|opt-out)[^"']*)["'][^>]*>(.*?)<\/a>/gim
    let match
    while ((match = mailtoRegex.exec(htmlContent)) !== null) {
      links.push({ url: match[1], text: match[2].trim(), method: "MAILTO" })
    }

    // Regex for HTTP/HTTPS links containing "unsubscribe" or "opt-out"
    const httpRegex = /<a[^>]*href=["'](https?:\/\/[^"']*(?:unsubscribe|opt-out)[^"']*)["'][^>]*>(.*?)<\/a>/gim
    while ((match = httpRegex.exec(htmlContent)) !== null) {
      links.push({ url: match[1], text: match[2].trim(), method: "GET" })
    }

    // Fallback: Look for any link with "unsubscribe" or "opt-out" in its text, even if URL doesn't contain it
    const genericLinkRegex = /<a[^>]*href=["'](https?:\/\/[^"']*)["'][^>]*>(.*?(?:unsubscribe|opt-out).*?)<\/a>/gim
    while ((match = genericLinkRegex.exec(htmlContent)) !== null) {
      if (!links.some((l) => l.url === match[1])) {
        links.push({ url: match[1], text: match[2].trim(), method: "GET" })
      }
    }

    return links
  }

  async processUnsubscribe(
    emailId: string,
    subject: string,
    sender: string,
    htmlContent: string,
  ): Promise<UnsubscribeResult> {
    await this.initializeBrowser()
    const result: UnsubscribeResult = {
      emailId,
      subject,
      sender,
      success: false,
      summary: "No unsubscribe link found or processed.",
      details: [],
    }

    const unsubscribeLinks = await this.extractUnsubscribeLinks(htmlContent)

    if (unsubscribeLinks.length === 0) {
      result.summary = "No unsubscribe link found in email."
      return result
    }

    for (const link of unsubscribeLinks) {
      const detailResult: UnsubscribeResult["details"][0] = {
        link,
        result: { success: false, method: link.method },
      }

      if (link.method === "MAILTO") {
        detailResult.result.success = true
        detailResult.result.details = `Mailto link detected: ${link.url}. Please send an email manually.`
        result.success = true
        result.summary = "Mailto link found. Manual email required."
        result.details.push(detailResult)
        continue
      }

      let page: Page | null = null
      try {
        // Create a new page for each unsubscribe attempt to ensure isolation
        page = await this.browser!.newPage()
        page.setDefaultNavigationTimeout(60000) // 60 seconds timeout

        // Listen for new pages (e.g., if a link opens in a new tab)
        const newPagePromise = new Promise<Page>((resolve) =>
          this.browser!.once("targetcreated", (target) => {
            if (target.type() === "page") {
              target.page().then(resolve)
            }
          }),
        )

        // Attempt to navigate, but also race against a new page opening
        const navigationPromise = page.goto(link.url, { waitUntil: "domcontentloaded" })

        const navigatedPage = await Promise.race([navigationPromise, newPagePromise])

        if (navigatedPage && navigatedPage !== page) {
          // If a new page opened, close the old one and switch to the new one
          await page.close()
          page = navigatedPage as Page
          await page.bringToFront()
          await page.waitForLoadState("domcontentloaded")
        } else if (!navigatedPage) {
          // If navigation failed and no new page, try to get the current page
          const pages = await this.browser!.pages()
          if (pages.length > 0) {
            page = pages[0]
            await page.bringToFront()
            await page.waitForLoadState("domcontentloaded")
          } else {
            throw new Error("No active page found after navigation attempt.")
          }
        }

        // Add a small delay to ensure content renders
        await page.waitForTimeout(2000)

        const pageContent = await page.content()
        const screenshot = await page.screenshot({ encoding: "base64" })

        const prompt = `
          You are an AI agent designed to help users unsubscribe from email lists.
          The user has provided the HTML content of an unsubscribe page.
          Your goal is to identify the necessary action to unsubscribe and provide instructions.

          Consider the following:
          - Look for buttons with text like "Unsubscribe", "Confirm", "Opt-out".
          - Look for forms that require an email address or a reason for unsubscribing.
          - Identify if the page confirms successful unsubscription.
          - Identify if the page requires a CAPTCHA or other complex interaction.

          HTML Content of the page:
          ${pageContent}

          Based on this HTML, what action should be taken to unsubscribe?
          Provide a concise summary of the page and the required action.
          If a form needs to be filled, specify the input fields (e.g., 'email', 'reason') and what values to provide (e.g., the user's email address: ${sender}).
          If a button needs to be clicked, specify its text or a unique selector.
          If it's already unsubscribed, state that.
          If it requires a CAPTCHA or complex interaction, state that it requires manual intervention.

          Output your response in a structured JSON format:
          {
            "summary": "A concise summary of the page and the required action.",
            "action": {
              "type": "click" | "fill_form" | "already_unsubscribed" | "manual_intervention",
              "selector"?: "CSS selector for button or form",
              "buttonText"?: "Text of the button to click",
              "fields"?: { "fieldName": "value" }, // For fill_form type
              "details"?: "Any additional details or instructions"
            }
          }
        `

        const { text: aiResponse } = await generateText({
          model: this.model,
          prompt: prompt,
          temperature: 0.2,
        })

        const parsedResponse = JSON.parse(aiResponse)

        detailResult.result.details = parsedResponse.summary
        detailResult.result.screenshot = `data:image/png;base64,${screenshot}`

        if (parsedResponse.action.type === "click") {
          const selector = parsedResponse.action.selector || `button:contains('${parsedResponse.action.buttonText}')`
          const button = await page.$(selector)
          if (button) {
            await button.click()
            await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {}) // Wait for potential redirect
            detailResult.result.success = true
            detailResult.result.details += "\nClicked button."
          } else {
            detailResult.result.error = "Button not found."
          }
        } else if (parsedResponse.action.type === "fill_form") {
          const formSelector = parsedResponse.action.selector || "form"
          const form = await page.$(formSelector)
          if (form && parsedResponse.action.fields) {
            for (const fieldName in parsedResponse.action.fields) {
              const value = parsedResponse.action.fields[fieldName]
              const inputSelector = `[name="${fieldName}"], #${fieldName}, .${fieldName}`
              const input = await form.$(inputSelector)
              if (input) {
                await input.type(value)
              } else {
                detailResult.result.error = `Input field ${fieldName} not found.`
                break
              }
            }
            if (!detailResult.result.error) {
              await Promise.all([
                form.evaluate((f: HTMLFormElement) => f.submit()),
                page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {}),
              ])
              detailResult.result.success = true
              detailResult.result.details += "\nFilled form and submitted."
            }
          } else {
            detailResult.result.error = "Form not found or no fields specified."
          }
        } else if (parsedResponse.action.type === "already_unsubscribed") {
          detailResult.result.success = true
          detailResult.result.details += "\nAlready unsubscribed."
        } else if (parsedResponse.action.type === "manual_intervention") {
          detailResult.result.error = "Manual intervention required (e.g., CAPTCHA)."
        }

        if (detailResult.result.success) {
          result.success = true
          result.summary = "Successfully processed unsubscribe link."
        } else if (!result.success) {
          result.summary = detailResult.result.error || "Failed to process unsubscribe link."
        }
      } catch (error: any) {
        detailResult.result.error = `Navigation error: ${error.message}`
        result.summary = `Error processing unsubscribe link: ${error.message}`
      } finally {
        if (page) {
          await page.close()
        }
      }
      result.details.push(detailResult)
      if (result.success) break // Stop if one link was successfully processed
    }

    return result
  }

  async bulkUnsubscribe(emailsToUnsubscribe: { id: string; subject: string; sender: string; htmlContent: string }[]) {
    await this.initializeBrowser()
    const allResults: UnsubscribeResult[] = []
    let successfulUnsubscribes = 0

    for (const email of emailsToUnsubscribe) {
      const result = await this.processUnsubscribe(email.id, email.subject, email.sender, email.htmlContent)
      allResults.push(result)
      if (result.success) {
        successfulUnsubscribes++
      }
      await new Promise((resolve) => setTimeout(resolve, 3000)) // Delay to avoid rate limits
    }

    await this.closeBrowser()
    return {
      results: allResults,
      processed: emailsToUnsubscribe.length,
      successful: successfulUnsubscribes,
    }
  }
}
