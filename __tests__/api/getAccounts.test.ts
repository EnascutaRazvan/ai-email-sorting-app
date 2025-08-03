import { GET } from "@/app/api/accounts/route"
import { getServerSession } from "next-auth"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
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

describe("GET /api/accounts", () => {
    const mockRequest = { url: "http://localhost/api/accounts" } as any

    beforeEach(() => {
        jest.clearAllMocks()
    })


    it("returns 500 if an unexpected error occurs", async () => {
        (getServerSession as jest.Mock).mockRejectedValueOnce(new Error("Unexpected"))

        const res = await GET(mockRequest)

        expect(res.status).toBe(500)
        expect(res.data).toEqual({ error: "Internal server error" })
    })
})
