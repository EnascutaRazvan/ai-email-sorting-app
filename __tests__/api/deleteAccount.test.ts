// __tests__/api/deleteAccount.test.ts
import { DELETE } from "@/app/api/accounts/[id]/route"
import { NextResponse } from "next/server"

// Mock next-auth
jest.mock("next-auth", () => ({
    __esModule: true,
    default: jest.fn(() => ({})),
    getServerSession: jest.fn(),
}))

// Mock the auth options import
jest.mock("@/app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}))

// Mock NextResponse
jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn((data, options) => ({
            data,
            status: options?.status || 200,
        })),
    },
}))
const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    delete: jest.fn().mockReturnThis(),
}
jest.mock("@supabase/supabase-js", () => {
    const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        delete: jest.fn().mockReturnThis(),
    }
    return {
        createClient: jest.fn(() => mockSupabaseClient),
        __mockClient: mockSupabaseClient // optional: export it for access in tests
    }
})

describe("DELETE /api/accounts/[id]", () => {
    const mockRequest = {
        url: "http://localhost:3000/api/accounts/123",
    } as NextRequest

    const mockParams = { params: { id: "123" } }

    beforeEach(() => {
        jest.clearAllMocks()
        // Reset all mock implementations
        mockSupabaseClient.from.mockReturnThis()
        mockSupabaseClient.select.mockReturnThis()
        mockSupabaseClient.eq.mockReturnThis()
        mockSupabaseClient.delete.mockReturnThis()
    })

    it("should return 401 if user is not authenticated", async () => {
        require("next-auth").getServerSession.mockResolvedValueOnce(null)

        const response = await DELETE(mockRequest, mockParams)

        expect(response.status).toBe(401)
        expect(response.data).toEqual({ error: "Unauthorized" })
    })


    it("should return 500 if account deletion fails", async () => {
        require("next-auth").getServerSession.mockResolvedValueOnce({ user: { id: "user123" } })
        mockSupabaseClient.single.mockResolvedValueOnce({ data: { is_primary: false }, error: null })
        mockSupabaseClient.delete.mockResolvedValueOnce({ error: { message: "Deletion failed" } })

        const response = await DELETE(mockRequest, mockParams)

        expect(response.status).toBe(500)
    })

})