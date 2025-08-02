import { describe, it, expect, vi, beforeEach } from "vitest"
import { UnsubscribeAgent } from "@/lib/server/unsubscribe-agent"
import { generateText } from "ai"

// Type assertion for the mocked function
const mockedGenerateText = generateText as vi.Mock

describe("UnsubscribeAgent", () => {
  let agent: UnsubscribeAgent

  beforeEach(() => {
    agent = new UnsubscribeAgent()
    vi.clearAllMocks()
  })

  describe("extractUnsubscribeLinks", () => {
    it("should extract unsubscribe links using the AI model", async () => {
      const emailContent = 'Please unsubscribe me. <a href="https://example.com/unsubscribe">Click here</a>'
      const mockResponse = JSON.stringify([
        {
          url: "https://example.com/unsubscribe",
          text: "Click here",
          method: "GET",
        },
      ])

      mockedGenerateText.mockResolvedValue({ text: mockResponse })

      const links = await agent.extractUnsubscribeLinks(emailContent)

      expect(links).toHaveLength(1)
      expect(links[0].url).toBe("https://example.com/unsubscribe")
      expect(links[0].method).toBe("GET")
      expect(mockedGenerateText).toHaveBeenCalledOnce()
    })

    it("should use fallback extraction if AI response is invalid JSON", async () => {
      const emailContent = "To stop receiving emails, visit https://example.com/unsubscribe/123"
      const mockResponse = "This is not a valid JSON"

      mockedGenerateText.mockResolvedValue({ text: mockResponse })

      const links = await agent.extractUnsubscribeLinks(emailContent)

      expect(links).toHaveLength(1)
      expect(links[0].url).toBe("https://example.com/unsubscribe/123")
      expect(links[0].method).toBe("GET")
    })

    it("should return an empty array if no links are found", async () => {
      const emailContent = "This is a regular email with no unsubscribe links."
      const mockResponse = "[]"

      mockedGenerateText.mockResolvedValue({ text: mockResponse })

      const links = await agent.extractUnsubscribeLinks(emailContent)

      expect(links).toHaveLength(0)
    })

    it("should use fallback extraction if AI model fails", async () => {
      const emailContent = "Fallback test with mailto:unsubscribe@example.com?subject=unsubscribe"
      mockedGenerateText.mockRejectedValue(new Error("AI API Error"))

      const links = await agent.extractUnsubscribeLinks(emailContent)

      expect(links).toHaveLength(1)
      expect(links[0].url).toContain("mailto:unsubscribe@example.com")
    })
  })
})
