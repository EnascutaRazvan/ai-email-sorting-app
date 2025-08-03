import { GET } from "@/app/api/emails/[id]/content/route"
import { getServerSession } from "next-auth"

const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    update: jest.fn().mockReturnThis(),
}

jest.mock("@supabase/supabase-js", () => {
    const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        update: jest.fn().mockReturnThis(),
    }

    return {
        createClient: jest.fn(() => mockSupabase),
        __mockSupabase: mockSupabase, // expose for test assertions
    }
})
jest.mock("next-auth", () => ({
    getServerSession: jest.fn(),
}))

jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}))

jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            data,
            status: init?.status || 200,
        })),
    },
}))

describe("GET /api/emails/[id]", () => {
    const mockRequest = { url: "http://localhost/api/emails/abc123" } as any
    const mockParams = { params: { id: "abc123" } }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("returns 401 if not authenticated", async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce(null)

        const response = await GET(mockRequest, mockParams)

        expect(response.status).toBe(401)
        expect(response.data).toEqual({ error: "Unauthorized" })
    })

    it("returns 404 if email not found", async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user1" } })
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: "not found" } })

        const response = await GET(mockRequest, mockParams)

        expect(response.status).toBe(404)
        expect(response.data).toEqual({ error: "Email not found" })
    })

    it("returns 200 and marks email as read", async () => {
        (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user1" } })

        const emailData = {
            id: "abc123",
            subject: "Hello",
            sender: "sender@example.com",
            received_at: "2024-01-01T12:00:00Z",
            ai_summary: "summary",
            email_body: "body content",
            is_read: false,
            categories: { name: "Work", color: "#f00" },
            user_accounts: { email: "acc@example.com", name: "Account" },
        }

        mockSupabase.single.mockResolvedValueOnce({ data: emailData, error: null })
        mockSupabase.update.mockResolvedValueOnce({})

        const response = await GET(mockRequest, mockParams)

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.email).toEqual({
            id: emailData.id,
            subject: emailData.subject,
            sender: emailData.sender,
            received_at: emailData.received_at,
            ai_summary: emailData.ai_summary,
            email_body: emailData.email_body,
            is_read: true,
            category: emailData.categories,
            account: emailData.user_accounts,
        })
        expect(mockSupabase.update).toHaveBeenCalled()
    })

    it("returns 500 if an unexpected error occurs", async () => {
        (getServerSession as jest.Mock).mockRejectedValueOnce(new Error("boom"))

        const response = await GET(mockRequest, mockParams)

        expect(response.status).toBe(500)
        expect(response.data).toEqual({ error: "Failed to fetch email content" })
    })
})
