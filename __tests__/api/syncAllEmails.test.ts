process.env.CRON_SECRET = "mysecret";
process.env.NEXTAUTH_URL = "http://testhost";

const supabaseChain = {
    from: jest.fn(() => supabaseChain),
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
};

const fetchMock = jest.fn();
(global as any).fetch = fetchMock;

jest.mock("@supabase/supabase-js", () => ({
    createClient: jest.fn(() => supabaseChain),
}));

beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

// Only import handler after setting env!
import { POST } from "../../app/api/emails/sync-all/route";
import { NextRequest } from "next/server";

function buildRequest({ headers = {} } = {}): NextRequest {
    return {
        headers: {
            get: (k: string) => headers[k.toLowerCase()] || null,
        },
    } as unknown as NextRequest;
}

describe("POST /api/emails/sync-all", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabaseChain.from.mockReturnValue(supabaseChain);
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue({
            data: [
                { id: "acc1", user_id: "u1", email: "a@example.com", access_token: "tk1" },
                { id: "acc2", user_id: "u2", email: "b@example.com", access_token: "tk2" },
            ],
            error: null,
        });
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({ imported: 5, processed: 10 }),
        });
    });

    it("returns 401 if authorization header missing or invalid", async () => {
        const req = buildRequest({ headers: { authorization: "Bearer wrong" } });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized" });
    });

    it("returns 500 if accounts fetch error", async () => {
        const req = buildRequest({ headers: { authorization: "Bearer mysecret" } });
        supabaseChain.eq.mockReturnValueOnce({ data: null, error: { message: "fail" } });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch accounts" });
    });

    it("returns 200 and aggregates imported/processed count", async () => {
        const req = buildRequest({ headers: { authorization: "Bearer mysecret" } });

        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ imported: 2, processed: 3 }),
        });
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ imported: 1, processed: 5 }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.accountsProcessed).toBe(2);
        expect(json.totalImported).toBe(3);
        expect(json.totalProcessed).toBe(8);
        expect(Array.isArray(json.results)).toBe(true);
        expect(json.results[0].success).toBe(true);
    });

    it("handles failed import for an account gracefully", async () => {
        const req = buildRequest({ headers: { authorization: "Bearer mysecret" } });

        fetchMock.mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
        });
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ imported: 1, processed: 2 }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.results.some((r: any) => r.success === false)).toBe(true);
    });

    it("catches thrown errors during processing", async () => {
        const req = buildRequest({ headers: { authorization: "Bearer mysecret" } });
        supabaseChain.eq.mockImplementationOnce(() => { throw new Error("fail") });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to sync emails" });
    });

    it("catches thrown errors for individual account", async () => {
        const req = buildRequest({ headers: { authorization: "Bearer mysecret" } });

        fetchMock.mockImplementationOnce(() => { throw new Error("fail!") });
        fetchMock.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ imported: 1, processed: 2 }),
        });

        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.results.some((r: any) => r.success === false)).toBe(true);
    });
});
