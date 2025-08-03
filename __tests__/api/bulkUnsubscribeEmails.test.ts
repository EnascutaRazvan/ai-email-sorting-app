let getServerSessionMock: jest.Mock;
const supabaseChain = {
    select: jest.fn(() => supabaseChain),
    in: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
};
const unsubscribeFetch = jest.fn();

jest.mock('next-auth', () => {
    getServerSessionMock = jest.fn();
    return { getServerSession: getServerSessionMock };
});
jest.mock('../../app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: () => supabaseChain,
    })),
}));
(global as any).fetch = unsubscribeFetch;

import { POST } from '../../app/api/emails/bulk-unsubscribe/route';
import { NextRequest } from 'next/server';

function buildRequest(json?: any): NextRequest {
    return { json: async () => json } as unknown as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

describe('POST /emails/bulk-unsubscribe', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.unsubscribe_agent = "https://agent";
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.in.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
    });

    it('returns 401 if not authenticated', async () => {
        getServerSessionMock.mockResolvedValue(null);
        const res = await POST(buildRequest({ emailIds: ['a'] }));
        const json = await res.json();
        expect(res.status).toBe(401);
        expect(json).toEqual({ error: "Unauthorized" });
    });

    it('returns 400 if emailIds missing or empty', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });

        for (const body of [{}, { emailIds: null }, { emailIds: [] }]) {
            const res = await POST(buildRequest(body));
            const json = await res.json();
            expect(res.status).toBe(400);
            expect(json).toEqual({ error: "Invalid email IDs provided" });
        }
    });

    it('returns 500 if supabase select fails', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
        supabaseChain.eq.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

        const res = await POST(buildRequest({ emailIds: ['a', 'b'] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to fetch emails" });
    });

    it('returns full results for agent flow (success and error)', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
        // Return two emails from supabase
        supabaseChain.eq.mockResolvedValueOnce({
            data: [
                { id: "e1", subject: "Sub1", sender: "S1", email_body: "HTML1", ai_summary: "" },
                { id: "e2", subject: "Sub2", sender: "S2", snippet: "Plain2", ai_summary: "AI" },
            ],
            error: null,
        });

        // First agent call: success
        unsubscribeFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                summary: "OK",
                results: ["r1"],
            }),
        });
        // Second agent call: fail
        unsubscribeFetch.mockResolvedValueOnce({
            ok: false,
            statusText: "failAgent",
            json: async () => ({}),
        });

        const res = await POST(buildRequest({ emailIds: ['e1', 'e2'] }));
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.processed).toBe(2);
        expect(json.successful).toBe(1);
        expect(json.results.length).toBe(2);

        // e1: success, e2: fail
        expect(json.results[0].success).toBe(true);
        expect(json.results[1].success).toBe(false);
        expect(json.results[1].summary).toMatch(/Error:/);
    });

    it('returns 500 on thrown error', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error("fail!"); });
        const res = await POST(buildRequest({ emailIds: ['a'] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Internal server error" });
    });
});
