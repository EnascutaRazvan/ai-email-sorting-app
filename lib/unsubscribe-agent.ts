"use server"

import { chromium, type Page } from "playwright-core"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
// Using @sparticuz/chromium to make it work on Vercel serverless functions
import sparticuzChromium from "@sparticuz/chromium"

// Define the structure for actions the AI can recommend
interface AgentAction {
  action: "click" | "fill" | "check" | "uncheck" | "select"
  selector: string
  value?: string // For 'fill' or 'select' actions
  label?: string // For context
}

interface UnsubscribeLink {
  url: string
  text: string
}

interface UnsubscribeResult {
  success: boolean
  summary: string
  actions: AgentAction[]
  finalUrl?: string
  confirmationText?: string
}

export class UnsubscribeAgent {
  private model = groq("llama-3.1-70b-versatile")

  // This method can stay similar, using an LLM to find the link in the email body.
  async extractUnsubscribeLinks(emailContent: string): Promise<UnsubscribeLink[]> {
    const { text } = await generateText({
      model: this.model,
      system:
        "You are an expert at finding unsubscribe links in email HTML content. Respond with a JSON array of objects.",
      prompt: `
      Analyze this email content and extract all unsubscribe links.
      Email content:
      ${emailContent.substring(0, 8000)}
      Return a JSON array of objects with this format:
      [
        {
          "url": "the full URL",
          "text": "the link text or surrounding context"
        }
      ]
      If no unsubscribe links are found, return an empty array. Only return links that are clearly for unsubscribing.
    `,
    })

    try {
      const links = JSON.parse(text)
      return Array.isArray(links) ? links : []
    } catch (error) {
      console.error("Error parsing unsubscribe links from AI:", error)
      return []
    }
  }

  private async getActionsFromAI(html: string): Promise<AgentAction[]> {
    const prompt = `
    You are an autonomous web agent whose task is to unsubscribe from email mailing lists.
    You are given the HTML content of a webpage that was opened from an "Unsubscribe" link in an email.
    Your goal is to find and activate the correct form, link, button, or input that will unsubscribe the user.

    Here are the rules:
    - Always prioritize options that indicate "unsubscribe", "opt-out", "stop receiving", or similar.
    - If a form is present, fill it with reasonable dummy values (like email: user@example.com) only if required.
    - If there are multiple options, select the one that unsubscribes from **all** emails or marketing emails.
    - Click buttons or links that clearly submit or confirm the unsubscription.
    - If a confirmation message appears (like “You’ve been unsubscribed”), stop.

    Given the following HTML content:
    ${html.substring(0, 12000)}

    Respond ONLY with a JSON array of step-by-step actions to execute.
    The format should be:
    [
      { "action": "click", "selector": "css-selector", "label": "Click the 'Unsubscribe All' radio button" },
      { "action": "fill", "selector": "input[type='email']", "value": "user@example.com", "label": "Fill in the email field" },
      { "action": "check", "selector": "input[type='checkbox']", "label": "Check the confirmation box" },
      { "action": "click", "selector": "button[type='submit']", "label": "Click the submit button" }
    ]
    If no action is needed (e.g., already unsubscribed), return an empty array.
  `

    const { text } = await generateText({
      model: this.model,
      prompt,
    })

    try {
      const actions = JSON.parse(text)
      return Array.isArray(actions) ? actions : []
    } catch (error) {
      console.error("Error parsing actions from AI:", error)
      return []
    }
  }

  private async executeActions(page: Page, actions: AgentAction[]): Promise<void> {
    for (const step of actions) {
      try {
        await page.waitForSelector(step.selector, { timeout: 5000 })
        switch (step.action) {
          case "click":
            await page.click(step.selector)
            break
          case "fill":
            if (typeof step.value === "string") {
              await page.fill(step.selector, step.value)
            }
            break
          case "check":
            await page.check(step.selector)
            break
          case "uncheck":
            await page.uncheck(step.selector)
            break
          case "select":
            if (typeof step.value === "string") {
              await page.selectOption(step.selector, step.value)
            }
            break
        }
        // Wait a bit after each action for the page to react
        await page.waitForTimeout(500)
      } catch (error) {
        console.error(`Failed to execute action: ${step.action} on ${step.selector}`, error)
        // We can decide to stop or continue on error. For now, let's stop.
        throw new Error(`Action failed: ${step.action} on selector ${step.selector}`)
      }
    }
  }

  async processUnsubscribeLink(url: string): Promise<UnsubscribeResult> {
    let browser = null
    const actionsTaken: AgentAction[] = []
    try {
      browser = await chromium.launch({
        args: sparticuzChromium.args,
        executablePath: await sparticuzChromium.executablePath(),
        headless: sparticuzChromium.headless,
      })

      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      })
      const page = await context.newPage()
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })

      // Initial check: maybe we are already unsubscribed
      const pageText = await page.textContent("body")
      if (pageText?.match(/you have been unsubscribed|you are unsubscribed|successfully unsubscribed/i)) {
        return {
          success: true,
          summary: "Already unsubscribed on landing page.",
          actions: [],
          finalUrl: page.url(),
          confirmationText: pageText.substring(0, 200),
        }
      }

      const html = await page.content()
      const actions = await this.getActionsFromAI(html)
      actionsTaken.push(...actions)

      if (actions.length === 0) {
        return {
          success: false,
          summary: "AI agent could not determine actions to take.",
          actions: [],
        }
      }

      await this.executeActions(page, actions)

      // Wait for navigation or for a success message to appear
      await page.waitForTimeout(2000)

      const confirmationHtml = await page.content()
      const confirmationText = await page.textContent("body")

      if (
        confirmationText?.match(
          /you have been unsubscribed|you are unsubscribed|successfully unsubscribed|unsubscription confirmed/i,
        )
      ) {
        return {
          success: true,
          summary: "Unsubscription confirmed on page.",
          actions: actionsTaken,
          finalUrl: page.url(),
          confirmationText: confirmationText.substring(0, 200),
        }
      }

      return {
        success: false,
        summary: "Actions were executed, but unsubscription could not be confirmed.",
        actions: actionsTaken,
        finalUrl: page.url(),
      }
    } catch (error) {
      console.error(`Error processing unsubscribe link ${url}:`, error)
      return {
        success: false,
        summary: `An error occurred: ${error.message}`,
        actions: actionsTaken,
      }
    } finally {
      if (browser) {
        await browser.close()
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
        summary: "No unsubscribe links found in email.",
      }
    }

    const results = []
    let successCount = 0

    // We'll just process the first link found for simplicity and to avoid multiple actions
    const firstLink = links[0]
    const result = await this.processUnsubscribeLink(firstLink.url)
    results.push({ link: firstLink, result })

    if (result.success) {
      successCount++
    }

    return {
      success: successCount > 0,
      results,
      summary: `Processed ${results.length} unsubscribe link. ${successCount > 0 ? "Success" : "Failed"}.`,
    }
  }
}
