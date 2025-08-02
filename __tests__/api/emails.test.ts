import { createMocks } from "node-mocks-http"
import { GET } from "@/app/api/emails/route"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import jest from "jest"

jest.mock("next-auth")
jest.mock("@supabase/supabase-js")

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe("/api/emails", () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return emails for authenticated user", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-123" },
    } as any)

    const mockEmails = [
      {
        id: "email-1",
        subject: "Test Email",
        sender: "test@example.com",
        categories: { id: "cat-1", name: "Work", color: "#3B82F6" },
        user_accounts: { email: "user@example.com", name: "User" },
      },
    ]

    mockSupabase.limit.mockResolvedValue({
      data: mockEmails,
      error: null,
    })

    const { req } = createMocks({ method: "GET" })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.emails).toHaveLength(1)
    expect(data.emails[0].category.name).toBe("Work")
  })

  it("should filter emails by category", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-123" },
    } as any)

    mockSupabase.limit.mockResolvedValue({
      data: [],
      error: null,
    })

    const { req } = createMocks({
      method: "GET",
      url: "/api/emails?category=cat-1",
    })

    await GET(req)

    expect(mockSupabase.eq).toHaveBeenCalledWith("category_id", "cat-1")
  })

  it("should filter uncategorized emails", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-123" },
    } as any)

    mockSupabase.limit.mockResolvedValue({
      data: [],
      error: null,
    })

    const { req } = createMocks({
      method: "GET",
      url: "/api/emails?category=uncategorized",
    })

    await GET(req)

    expect(mockSupabase.is).toHaveBeenCalledWith("category_id", null)
  })

  it("should search emails", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "user-123" },
    } as any)

    mockSupabase.limit.mockResolvedValue({
      data: [],
      error: null,
    })

    const { req } = createMocks({
      method: "GET",
      url: "/api/emails?search=test",
    })

    await GET(req)

    expect(mockSupabase.or).toHaveBeenCalledWith(
      "subject.ilike.%test%,sender.ilike.%test%,snippet.ilike.%test%,ai_summary.ilike.%test%",
    )
  })
})
