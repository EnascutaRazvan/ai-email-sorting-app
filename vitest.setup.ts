import { vi } from "vitest"

// Mock the AI SDK to prevent actual API calls during unit tests
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    generateText: vi.fn(),
  }
})

// Mock Playwright to prevent it from launching a browser during unit tests
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          screenshot: vi.fn().mockResolvedValue(Buffer.from("")),
          content: vi.fn().mockResolvedValue("<html></html>"),
          click: vi.fn(),
          fill: vi.fn(),
          selectOption: vi.fn(),
        }),
      }),
      close: vi.fn(),
    }),
  },
}))
