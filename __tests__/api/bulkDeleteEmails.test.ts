let getServerSessionMock: jest.Mock;
const supabaseChain = {
    delete: jest.fn(() => supabaseChain),
    in: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
};

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

import { POST } from '../../app/api/emails/bulk-delete/route';
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

describe('POST /emails/bulk-delete', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabaseChain.delete.mockReturnValue(supabaseChain);
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

    it('returns 500 if supabase delete fails', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
        supabaseChain.eq.mockResolvedValueOnce({ error: { message: "fail" } });

        const res = await POST(buildRequest({ emailIds: ['a', 'b'] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Failed to delete emails" });
    });

    it('returns success and count if deleted', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
        supabaseChain.eq.mockResolvedValueOnce({ error: null });

        const res = await POST(buildRequest({ emailIds: ['a', 'b'] }));
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json).toEqual({ success: true, deletedCount: 2 });
    });

    it('returns 500 on thrown error', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error("fail!"); });
        const res = await POST(buildRequest({ emailIds: ['a'] }));
        const json = await res.json();
        expect(res.status).toBe(500);
        expect(json).toEqual({ error: "Internal server error" });
    });
});
