import { createMocks } from "node-mocks-http"
import { GET, POST } from "@/app/api/categories/route"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import jest from "jest" // Import jest to declare it

// Mock dependencies
jest.mock("next-auth")
jest.mock("@supabase/supabase-js")

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe("/api/categories", () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/categories", () => {
    it("should return categories for authenticated user", async () => {
      // Mock authenticated session
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      // Mock Supabase response
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            id: "cat-1",
            name: "Work",
            description: "Work emails",
            color: "#3B82F6",
            emails: [{ count: 5 }],
          },
        ],
        error: null,
      })

      const { req } = createMocks({ method: "GET" })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.categories).toHaveLength(1)
      expect(data.categories[0].email_count).toBe(5)
    })

    it("should return 401 for unauthenticated user", async () => {
      mockGetServerSession.mockResolvedValue(null)

      const { req } = createMocks({ method: "GET" })
      const response = await GET(req)

      expect(response.status).toBe(401)
    })

    it("should handle database errors", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      })

      const { req } = createMocks({ method: "GET" })
      const response = await GET(req)

      expect(response.status).toBe(500)
    })
  })

  describe("POST /api/categories", () => {
    it("should create new category", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      const newCategory = {
        id: "cat-new",
        name: "Test Category",
        description: "Test description",
        color: "#3B82F6",
      }

      mockSupabase.insert.mockResolvedValue({
        data: newCategory,
        error: null,
      })

      const { req } = createMocks({
        method: "POST",
        body: {
          name: "Test Category",
          description: "Test description",
          color: "#3B82F6",
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.category.name).toBe("Test Category")
    })

    it("should validate required fields", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      const { req } = createMocks({
        method: "POST",
        body: { name: "" },
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })
  })
})
