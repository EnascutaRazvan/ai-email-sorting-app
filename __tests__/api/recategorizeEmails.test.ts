// __tests__/api/recategorizeEmails.test.ts

let getServerSessionMock: jest.Mock;
const supabaseChain = {
    from: jest.fn(() => supabaseChain),
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
    in: jest.fn(() => supabaseChain),
    update: jest.fn(() => supabaseChain),
};

jest.mock("next-auth", () => {
    getServerSessionMock = jest.fn();
    return { getServerSession: getServerSessionMock };
});
jest.mock("../../app/api/auth/[...nextauth]/route", () => ({
    authOptions: {},
}));
jest.mock("@supabase/supabase-js", () => ({
    createClient: jest.fn(() => supabaseChain),
}));
jest.mock("ai", () => ({
    generateText: jest.fn(() => ({ text: "My Category" })),
}));
jest.mock("@ai-sdk/groq", () => ({
    groq: jest.fn(() => ({})),
}));

import { POST } from "../../app/api/emails/recategorize/route";
import { NextRequest } from "next/server";

function buildRequest(json?: any): NextRequest {
    return { json: async () => json } as unknown as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

describe("POST /emails/recategorize", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: everything succeeds with 1 category and 1 email
        supabaseChain.from.mockReturnValue(supabaseChain);
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
        supabaseChain.in.mockReturnValue(supabaseChain);
        supabaseChain.update.mockReturnValue({ error: null });
    });

    it("returns 401 if not authenticated", async () => {
        getServerSessionMock.mockResolvedValue(null);
        const res = await POST(buildRequest({ emailIds: ["id"] }));
        const json = await res.json();
        expect(res.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 if emailIds invalid", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        const res = await POST(buildRequest({}));
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json).toEqual({ error: "Email IDs are required" });
    });

    it("returns 500 if categories error", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // Categories fetch returns error
        supabaseChain.from.mockImplementation((table) => {
            if (table === "categories") {
                return {
                    select: () => ({
                        eq: () => ({ data: null, error: { message: "fail" } }),
                    }),
                };
            }
            return supabaseChain;
        });
        const res = await POST(buildRequest({ emailIds: ["id"] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch categories" });
    });

    it("returns 400 if no categories", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // Categories returns empty
        supabaseChain.from.mockImplementation((table) => {
            if (table === "categories") {
                return {
                    select: () => ({
                        eq: () => ({ data: [], error: null }),
                    }),
                };
            }
            // emails not called
            return supabaseChain;
        });
        const res = await POST(buildRequest({ emailIds: ["id"] }));
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json).toEqual({ error: "No categories found" });
    });

    it("returns 500 if emails fetch error", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // categories returns one
        supabaseChain.from.mockImplementation((table) => {
            if (table === "categories") {
                return {
                    select: () => ({
                        eq: () => ({ data: [{ id: "c1", name: "My Category", description: "desc", color: "#fff" }], error: null }),
                    }),
                };
            }
            if (table === "emails") {
                return {
                    select: () => ({
                        in: () => ({
                            eq: () => ({ data: null, error: { message: "fail" } }),
                        }),
                    }),
                };
            }
            return supabaseChain;
        });
        const res = await POST(buildRequest({ emailIds: ["id"] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch emails" });
    });

    it("returns 404 if no emails", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        supabaseChain.from.mockImplementation((table) => {
            if (table === "categories") {
                return {
                    select: () => ({
                        eq: () => ({ data: [{ id: "c1", name: "My Category", description: "desc", color: "#fff" }], error: null }),
                    }),
                };
            }
            if (table === "emails") {
                return {
                    select: () => ({
                        in: () => ({
                            eq: () => ({ data: [], error: null }),
                        }),
                    }),
                };
            }
            return supabaseChain;
        });
        const res = await POST(buildRequest({ emailIds: ["id"] }));
        const json = await res.json();
        expect(res.status).toBe(404);
        expect(json).toEqual({ error: "No emails found" });
    });

    it("returns 500 on thrown error", async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error("fail!"); });
        const res = await POST(buildRequest({ emailIds: ["id"] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to recategorize emails" });
    });
});
