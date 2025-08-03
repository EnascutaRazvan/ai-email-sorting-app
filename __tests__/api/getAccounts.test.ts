beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
});

jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('../../app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

// The supabase query builder mock chain:
const supabaseChain = {
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
    order: jest.fn(() => supabaseChain),
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: () => supabaseChain,
    })),
}));

import { GET } from '../../app/api/accounts/route';
import { NextRequest } from 'next/server';
const { getServerSession } = require('next-auth');

function buildRequest(): NextRequest {
    return {} as NextRequest;
}

describe('GET /accounts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset order() to default chain
        supabaseChain.order.mockImplementation(() => supabaseChain);
    });

    it('returns 401 if user is not authenticated', async () => {
        getServerSession.mockResolvedValue(null);

        const response = await GET(buildRequest());
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 if supabase returns error', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
        supabaseChain.order.mockImplementationOnce(() => ({
            order: jest.fn(() => Promise.resolve({ data: null, error: { message: 'Supabase error' } }))
        }));

        const response = await GET(buildRequest());
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Failed to fetch accounts' });
    });

    it('returns accounts with computed fields on success', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });

        const mockAccounts = [
            {
                id: 'a1',
                email: 'user1@email.com',
                is_primary: true,
                token_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2hr in future
                scope: 'gmail.readonly profile',
            },
            {
                id: 'a2',
                email: 'user2@email.com',
                is_primary: false,
                token_expires_at: new Date(Date.now() - 100000).toISOString(), // expired
                scope: null,
            },
        ];
        supabaseChain.order.mockImplementationOnce(() => ({
            order: jest.fn(() => Promise.resolve({ data: mockAccounts, error: null }))
        }));

        const response = await GET(buildRequest());
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json.accounts.length).toBe(2);
        expect(json.accounts[0].token_status).toBe('valid'); // now passes!
        expect(json.accounts[0].permissions).toEqual(['gmail.readonly', 'profile']);
        expect(json.accounts[1].token_status).toBe('expired');
        expect(json.accounts[1].permissions).toEqual([]);
        expect(json.total).toBe(2);
        expect(json.primary).toBe('user1@email.com');
    });

    it('returns 500 if handler throws', async () => {
        getServerSession.mockImplementation(() => { throw new Error('fail'); });
        const response = await GET(buildRequest());
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Internal server error' });
    });
});
