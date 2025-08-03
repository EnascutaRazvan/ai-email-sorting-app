let getServerSessionMock: jest.Mock;

const supabaseChain = {
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
    order: jest.fn(() => supabaseChain),
    insert: jest.fn(() => supabaseChain),
    single: jest.fn(),
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

import { GET, POST } from '../../app/api/categories/route';
import { NextRequest } from 'next/server';

function buildRequest(jsonData?: any): NextRequest {
    // Polyfill minimal json method for NextRequest
    return {
        json: jsonData ? async () => jsonData : undefined,
    } as unknown as NextRequest;
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
});

describe('/categories GET', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
        supabaseChain.order.mockReturnValue(supabaseChain);
    });

    it('returns 401 if not authenticated', async () => {
        getServerSessionMock.mockResolvedValue(null);

        const response = await GET(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 500 if supabase error', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
        supabaseChain.order.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

        const response = await GET(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Failed to fetch categories' });
    });

    it('returns transformed categories on success', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
        const mockCategories = [
            { id: 'c1', name: 'A', emails: [{ count: 3 }] },
            { id: 'c2', name: 'B', emails: [{}] },
            { id: 'c3', name: 'C', emails: undefined },
        ];
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.eq.mockReturnValue(supabaseChain);
        supabaseChain.order.mockResolvedValueOnce({ data: mockCategories, error: null });

        const response = await GET(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.categories.length).toBe(3);
        expect(json.categories[0].email_count).toBe(3);
        expect(json.categories[1].email_count).toBe(0);
        expect(json.categories[2].email_count).toBe(0);
    });

    it('returns 500 if exception thrown', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error('fail!'); });

        const response = await GET(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Internal server error' });
    });
});

describe('/categories POST', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabaseChain.insert.mockReturnValue(supabaseChain);
        supabaseChain.select.mockReturnValue(supabaseChain);
        supabaseChain.single.mockReset();
    });

    it('returns 401 if not authenticated', async () => {
        getServerSessionMock.mockResolvedValue(null);

        const response = await POST(buildRequest({ name: "Inbox" }));
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 400 if name missing', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });

        const response = await POST(buildRequest({}));
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json).toEqual({ error: 'Category name is required' });
    });

    it('returns 500 if supabase insert error', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
        supabaseChain.single.mockResolvedValueOnce({ data: null, error: { message: 'fail' } });

        const response = await POST(buildRequest({ name: "Test" }));
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Failed to create category' });
    });

    it('returns new category on success', async () => {
        getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
        supabaseChain.single.mockResolvedValueOnce({ data: { id: 'catx', name: 'Test', emails: [] }, error: null });

        const response = await POST(buildRequest({ name: "Test", description: "desc", color: "#333" }));
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.category.name).toBe("Test");
        expect(json.category.email_count).toBe(0);
    });

    it('returns 500 if exception thrown', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error('fail!'); });

        const response = await POST(buildRequest({ name: "Whatever" }));
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Internal server error' });
    });
});
