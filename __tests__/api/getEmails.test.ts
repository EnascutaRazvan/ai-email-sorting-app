/**
 * __tests__/api/getEmails.test.ts
 */
let getServerSessionMock: jest.Mock;
let supabaseClientMock: any;
const emailsData = [
    {
        id: "e1",
        subject: "Subject",
        sender: "Sender",
        is_read: false,
        is_starred: false,
        is_archived: false,
        received_at: "2024-08-01T12:00:00Z",
        snippet: "snippet",
        ai_summary: "summary",
        categories: { id: "c1", name: "Cat1", color: "#fff" },
        user_accounts: { email: "acc@example.com", name: "Account" },
    },
];

// --- Chainable Query Builder Mock ---
function buildEmailsQueryChain(returnData = emailsData, returnError = null) {
    const chain: any = {};
    // All builder methods chain
    [
        "eq", "is", "gte", "lte", "ilike", "or",
        "order", "limit", "select",
    ].forEach((fn) => {
        chain[fn] = jest.fn(() => chain);
    });
    // Await resolves to { data, error }
    chain.then = (resolve: any) => resolve({ data: returnData, error: returnError });
    return chain;
}

jest.mock('next-auth', () => {
    getServerSessionMock = jest.fn();
    return { getServerSession: getServerSessionMock };
});
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));
jest.mock('@supabase/supabase-js', () => {
    supabaseClientMock = {
        from: jest.fn(() => buildEmailsQueryChain()),
    };
    return {
        createClient: jest.fn(() => supabaseClientMock),
    };
});

import { GET } from '../../app/api/emails/route';
import { NextRequest } from "next/server";

function makeRequest(url: string) {
    return { url } as unknown as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

describe("GET /api/emails", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock to chainable
        supabaseClientMock.from.mockImplementation((table: string) => {
            if (table === "emails") return buildEmailsQueryChain(emailsData, null);
            return buildEmailsQueryChain([], null);
        });
    });

    it("returns 401 if not authenticated", async () => {
        getServerSessionMock.mockResolvedValue(null);
        const req = makeRequest("http://localhost/api/emails");
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 500 if query error", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        supabaseClientMock.from.mockImplementation((table: string) => {
            if (table === "emails") return buildEmailsQueryChain(null, { message: "fail" });
            return buildEmailsQueryChain([], null);
        });
        const req = makeRequest("http://localhost/api/emails");
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch emails" });
    });

    it("returns transformed emails if ok", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        const req = makeRequest("http://localhost/api/emails");
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(Array.isArray(json.emails)).toBe(true);
        expect(json.emails[0]).toMatchObject({
            id: "e1",
            subject: "Subject",
            category: { id: "c1", name: "Cat1", color: "#fff" },
            account: { email: "acc@example.com", name: "Account" },
        });
    });

    it("applies all filters and still returns success", async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: "u1" } });
        // Make a mock with all query builder methods
        const filters = [
            "category=starred",
            "account=acc1",
            "dateFrom=2024-07-01",
            "dateTo=2024-07-31",
            "sender=Sender",
            "search=summary"
        ].join("&");
        const url = `http://localhost/api/emails?${filters}`;
        const req = makeRequest(url);

        supabaseClientMock.from.mockImplementation((table: string) => {
            if (table === "emails") return buildEmailsQueryChain(emailsData, null);
            return buildEmailsQueryChain([], null);
        });

        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(Array.isArray(json.emails)).toBe(true);
    });

    it("returns 500 on exception", async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error("fail!"); });
        const req = makeRequest("http://localhost/api/emails");
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Internal server error" });
    });
});
