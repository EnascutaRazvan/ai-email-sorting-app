import { createMocks } from "node-mocks-http"
import { GET } from "@/app/api/accounts/route"
import { DELETE } from "@/app/api/accounts/[id]/route"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import jest from "jest"

jest.mock("next-auth")
jest.mock("@supabase/supabase-js")

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe("/api/accounts", () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    }
    mockCreateClient.mockReturnValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/accounts", () => {
    it("should return user accounts", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      const mockAccounts = [
        {
          id: "acc-1",
          email: "user@example.com",
          is_primary: true,
          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          scope: "email profile",
        },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockAccounts,
        error: null,
      })

      const { req } = createMocks({ method: "GET" })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.accounts).toHaveLength(1)
      expect(data.accounts[0].token_status).toBe("valid")
    })
  })

  describe("DELETE /api/accounts/[id]", () => {
    it("should delete non-primary account", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      // Mock account fetch
      mockSupabase.single.mockResolvedValueOnce({
        data: { is_primary: false },
        error: null,
      })

      // Mock delete
      mockSupabase.delete.mockResolvedValue({
        error: null,
      })

      const { req } = createMocks({ method: "DELETE" })
      const response = await DELETE(req, { params: { id: "acc-1" } })

      expect(response.status).toBe(200)
    })

    it("should not delete primary account", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123" },
      } as any)

      mockSupabase.single.mockResolvedValue({
        data: { is_primary: true },
        error: null,
      })

      const { req } = createMocks({ method: "DELETE" })
      const response = await DELETE(req, { params: { id: "acc-1" } })

      expect(response.status).toBe(400)
    })
  })
})
