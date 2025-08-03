// __tests__/api/importEmails.test.ts

let getServerSessionMock: jest.Mock;
const supabaseChain: any = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn(),
    from: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
};
const fetchMock = jest.fn();
(global as any).fetch = fetchMock;

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
    generateText: jest.fn(() => ({ text: "summary" })),
}));
jest.mock("@ai-sdk/groq", () => ({
    groq: jest.fn(() => ({})),
}));
jest.mock("html-to-text", () => ({
    htmlToText: jest.fn(() => "cleaned"),
}));

import { POST } from "../../app/api/emails/import/route";
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

describe("POST /emails/import", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.NEXTAUTH_URL = "http://localhost:3000";
        process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.supabase";
        process.env.SUPABASE_SERVICE_ROLE_KEY = "role-key";

        // Reset all supabase chain mocks
        for (const k in supabaseChain) {
            if (typeof supabaseChain[k].mockReset === "function") supabaseChain[k].mockReset();
        }
        supabaseChain.from.mockReset();
        supabaseChain.insert.mockReset();
        supabaseChain.update.mockReset();
        fetchMock.mockReset();
    });

    it("returns 401 if not authenticated", async () => {
        getServerSessionMock.mockResolvedValue(null);
        const res = await POST(buildRequest({ accountId: "x" }));
        const json = await res.json();
        expect(res.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 if accountId missing", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        const res = await POST(buildRequest({}));
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json).toEqual({ error: "Account ID is required" });
    });

    it("returns 404 if account not found", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // .single() for account returns { data: null }
        supabaseChain.from.mockImplementationOnce(() => ({
            select: () => ({
                eq: () => ({
                    eq: () => ({
                        single: () => Promise.resolve({ data: null, error: null }),
                    }),
                }),
            }),
        }));
        const res = await POST(buildRequest({ accountId: "nope" }));
        const json = await res.json();
        expect(res.status).toBe(404);
        expect(json).toEqual({ error: "Account not found" });
    });

    it("returns 500 if category query error", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // 1. Account fetch: good
        supabaseChain.from
            .mockImplementationOnce(() => ({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: "acc", access_token: "tk", created_at: new Date().toISOString() },
                                error: null,
                            }),
                        }),
                    }),
                }),
            }))
            // 2. Categories fetch: returns error
            .mockImplementationOnce(() => ({
                select: () => ({
                    eq: () => Promise.resolve({
                        data: null,
                        error: { message: "fail" },
                    }),
                }),
            }));
        const res = await POST(buildRequest({ accountId: "acc" }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch categories" });
    });

    it("returns 500 if Gmail API returns not ok", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // 1. Account fetch: good
        supabaseChain.from
            .mockImplementationOnce(() => ({
                select: () => ({
                    eq: () => ({
                        eq: () => ({
                            single: () => Promise.resolve({
                                data: { id: "acc", access_token: "tk", created_at: new Date().toISOString() },
                                error: null,
                            }),
                        }),
                    }),
                }),
            }))
            // 2. Categories fetch: good
            .mockImplementationOnce(() => ({
                select: () => ({
                    eq: () => Promise.resolve({
                        data: [{ id: "cat", name: "Inbox", description: "" }],
                        error: null,
                    }),
                }),
            }));

        // Gmail fails
        fetchMock.mockResolvedValueOnce({ ok: false, text: async () => "fail" });

        const res = await POST(buildRequest({ accountId: "acc" }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch emails from Gmail" });
    });


    it("returns 500 on thrown error", async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error("fail!"); });
        const res = await POST(buildRequest({ accountId: "acc" }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to import emails" });
    });
});
