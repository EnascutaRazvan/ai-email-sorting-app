let getServerSessionMock: jest.Mock;
const eqFinalMock = jest.fn();
const supabaseUpdateChain = {
    eq: jest.fn(() => supabaseUpdateChain),
};
const supabaseChain = {
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
    single: jest.fn(),
    from: jest.fn(() => supabaseChain),
    update: jest.fn(() => supabaseUpdateChain),
};

(global as any).fetch = jest.fn();

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

import { GET } from "../../app/api/emails/[id]/content/route";
import { NextRequest } from "next/server";

function buildRequest(): NextRequest {
    // Provide a dummy URL since not used
    return { url: "https://localhost/api/emails/email-123/content" } as unknown as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

describe("GET /emails/[id]/content", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Select & eq chain
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
        supabaseChain.from.mockReturnValue(supabaseChain);

        supabaseChain.single.mockReset();
        supabaseChain.update.mockReturnValue(supabaseUpdateChain);

        // Mark email as read: update().eq().eq() -> resolves to { error: null }
        supabaseUpdateChain.eq.mockImplementationOnce(() => ({
            eq: eqFinalMock
        }));
        eqFinalMock.mockResolvedValue({ error: null });
    });

    it("returns 401 if not authenticated", async () => {
        getServerSessionMock.mockResolvedValue(null);
        const res = await GET(buildRequest(), { params: { id: "email-123" } });
        const json = await res.json();
        expect(res.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 404 if not found", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        supabaseChain.single.mockResolvedValueOnce({ data: null, error: null });

        const res = await GET(buildRequest(), { params: { id: "not-found" } });
        const json = await res.json();
        expect(res.status).toBe(404);
        expect(json).toEqual({ error: "Email not found" });
    });

    it("returns 404 if supabase error", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        supabaseChain.single.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

        const res = await GET(buildRequest(), { params: { id: "not-found" } });
        const json = await res.json();
        expect(res.status).toBe(404);
        expect(json).toEqual({ error: "Email not found" });
    });

    it("returns email content and marks as read", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        supabaseChain.single.mockResolvedValueOnce({
            data: {
                id: "email-123",
                subject: "subject",
                sender: "me",
                received_at: "2024-07-01T00:00:00Z",
                ai_summary: "sum",
                email_body: "html",
                clean_email_body: "txt",
                categories: { name: "A", color: "#fff" },
                user_accounts: { email: "e@e.com", name: "U" },
            },
            error: null,
        });
        // Set up the chain for .update().eq().eq()
        supabaseUpdateChain.eq.mockImplementationOnce(() => ({
            eq: eqFinalMock
        }));
        eqFinalMock.mockResolvedValue({ error: null });

        const res = await GET(buildRequest(), { params: { id: "email-123" } });
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.email).toMatchObject({
            id: "email-123",
            subject: "subject",
            sender: "me",
            received_at: "2024-07-01T00:00:00Z",
            ai_summary: "sum",
            email_body: "html",
            clean_email_body: "txt",
            is_read: true,
            category: { name: "A", color: "#fff" },
            account: { email: "e@e.com", name: "U" },
        });
    });

    it("returns 500 on thrown error", async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error("fail!"); });
        const res = await GET(buildRequest(), { params: { id: "email-123" } });
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch email content" });
    });
});
