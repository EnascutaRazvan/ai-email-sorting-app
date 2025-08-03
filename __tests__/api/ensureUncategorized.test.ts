// Mock NextAuth and Supabase
let getServerSessionMock: jest.Mock;

const supabaseChain = {
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
    single: jest.fn(),
    insert: jest.fn(() => supabaseChain),
};

jest.mock('next-auth', () => {
    getServerSessionMock = jest.fn();
    return {
        getServerSession: getServerSessionMock,
    };
});
jest.mock('../../app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: () => supabaseChain,
    })),
}));

import { POST } from '../../app/api/categories/ensure-uncategorized/route';
import { NextRequest } from 'next/server';

function buildRequest(): NextRequest {
    return {} as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

describe('POST /ensure-uncategorized', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
        supabaseChain.single.mockReset();
        supabaseChain.insert.mockReturnValue(supabaseChain);
    });

    it('returns 401 if not authenticated', async () => {
        getServerSessionMock.mockResolvedValue(null);

        const response = await POST(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns existing category if found', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user1' } });
        supabaseChain.single
            .mockResolvedValueOnce({ data: { id: 'cat1', name: 'Uncategorized' } }); // found
        const response = await POST(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.category.name).toBe('Uncategorized');
    });

    it('creates category if not found, returns new one', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user1' } });
        supabaseChain.single
            .mockResolvedValueOnce({ data: null }) // not found
            .mockResolvedValueOnce({ data: { id: 'cat2', name: 'Uncategorized' }, error: null }); // after insert
        supabaseChain.insert.mockReturnValue(supabaseChain);

        const response = await POST(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.category.name).toBe('Uncategorized');
    });

    it('returns 500 if insert error', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user1' } });
        supabaseChain.single
            .mockResolvedValueOnce({ data: null }) // not found
            .mockResolvedValueOnce({ data: null, error: { message: 'fail' } }); // insert fails
        supabaseChain.insert.mockReturnValue(supabaseChain);

        const response = await POST(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Failed to create category' });
    });

    it('returns 500 on thrown error', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error('fail!'); });

        const response = await POST(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Internal server error' });
    });
});
