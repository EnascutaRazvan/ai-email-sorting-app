
let getServerSessionMock: jest.Mock;
const supabaseChain = {
    delete: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
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

import { DELETE } from '../../app/api/categories/[id]/route';
import { NextRequest } from 'next/server';

function buildParams(id: string) {
    return { params: { id } };
}
function buildRequest(): NextRequest {
    return {} as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
});

describe('DELETE /categories/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset chain to return itself for chain calls
        supabaseChain.delete.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
    });

    it('returns 401 if not authenticated', async () => {
        getServerSessionMock.mockResolvedValue(null);
        const response = await DELETE(buildRequest(), buildParams('cat-1'));
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 if supabase delete fails', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
        supabaseChain.delete.mockReturnValue(supabaseChain);
        supabaseChain.eq
            .mockReturnValueOnce(supabaseChain)
            .mockResolvedValueOnce({ error: { message: 'fail' } }); // LAST eq resolves with error
        const response = await DELETE(buildRequest(), buildParams('cat-2'));
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Failed to delete category' });
    });

    it('returns 200 if delete successful', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
        supabaseChain.delete.mockReturnValue(supabaseChain);
        supabaseChain.eq
            .mockReturnValueOnce(supabaseChain)
            .mockResolvedValueOnce({ error: null }); // LAST eq resolves with success
        const response = await DELETE(buildRequest(), buildParams('cat-3'));
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json).toEqual({ success: true });
    });

    it('returns 500 if exception thrown', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error('fail!') });
        const response = await DELETE(buildRequest(), buildParams('cat-4'));
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Internal server error' });
    });
});
