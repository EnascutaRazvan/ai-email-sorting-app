
let supabaseSelectMock: jest.Mock, supabaseSingleMock: jest.Mock, supabaseUpsertMock: jest.Mock;
const HTML_CHECK = /<title>Account Connected<\/title>/i;

const supabaseChain = {
    select: jest.fn(() => supabaseChain),
    eq: jest.fn(() => supabaseChain),
    single: jest.fn(),
    upsert: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: () => supabaseChain,
    })),
}));

// global fetch
const globalAny: any = global;
const fetchMock = jest.fn();
globalAny.fetch = fetchMock;

import { GET } from '../../app/api/auth/connect-callback/route';
import { NextRequest } from 'next/server';

const OLD_ENV = process.env;

function buildRequest(params: Record<string, string>) {
    const url = `https://localhost/api/auth/connect-callback?${new URLSearchParams(params)}`;
    return { url } as NextRequest;
}

// Helper: make a valid state
function makeState(opts: Partial<{ userId: string; timestamp: number; nonce: string }> = {}) {
    const base = {
        userId: "user-abc",
        timestamp: Date.now(),
        nonce: "xyz123",
        ...opts,
    };
    return Buffer.from(JSON.stringify(base)).toString("base64url");
}

beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => { });
    jest.spyOn(console, 'log').mockImplementation(() => { });
});
afterAll(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
});

describe('GET /auth/connect-callback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV };
        process.env.GOOGLE_CLIENT_ID = 'foo';
        process.env.GOOGLE_CLIENT_SECRET = 'bar';
        process.env.NEXTAUTH_URL = 'https://localhost:3000';

        // reset mock chain
        Object.values(supabaseChain).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    });

    it('redirects with oauth error if error param present', async () => {
        const response = await GET(buildRequest({ error: 'access_denied', error_description: 'nope' }));
        expect(response.headers.get('location')).toMatch(/error=access_denied/);
    });

    it('redirects with missing_params if code/state missing', async () => {
        const response = await GET(buildRequest({}));
        expect(response.headers.get('location')).toMatch(/error=missing_params/);
    });

    it('redirects with invalid_state if state can\'t be decoded', async () => {
        const response = await GET(buildRequest({ code: 'x', state: 'not-base64' }));
        expect(response.headers.get('location')).toMatch(/error=invalid_state/);
    });

    it('redirects with invalid_state if state is too old', async () => {
        const oldState = makeState({ timestamp: Date.now() - 7000000 });
        const response = await GET(buildRequest({ code: 'y', state: oldState }));
        expect(response.headers.get('location')).toMatch(/error=invalid_state/);
    });

    it('redirects with token_exchange_failed if token exchange fails', async () => {
        const state = makeState();
        fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'bad' }) }); // token endpoint
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=token_exchange_failed/);
    });

    it('redirects with token_exchange_failed if tokens missing', async () => {
        const state = makeState();
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // no access_token
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=token_exchange_failed/);
    });

    it('redirects with user_info_failed if userinfo fetch fails', async () => {
        const state = makeState();
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', refresh_token: 'rtok', expires_in: 1000, scope: 'test' }) }) // token endpoint
            .mockResolvedValueOnce({ ok: false }); // userinfo endpoint
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=user_info_failed/);
    });

    it('redirects with invalid_user_info if userInfo incomplete', async () => {
        const state = makeState();
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', refresh_token: 'rtok', expires_in: 1000, scope: 'test' }) }) // token endpoint
            .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // userinfo endpoint (missing id/email)
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=invalid_user_info/);
    });

    it('redirects with account_already_connected if another user owns this gmail', async () => {
        const state = makeState();
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', refresh_token: 'rtok', expires_in: 1000, scope: 'test' }) }) // token endpoint
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'gmailid', email: 'foo@gmail.com' }) }); // userinfo endpoint
        supabaseChain.select.mockReturnThis();
        supabaseChain.eq.mockReturnThis();
        supabaseChain.single.mockResolvedValue({ data: { user_id: 'other-user', email: 'foo@gmail.com' } });
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=account_already_connected/);
    });

    it('redirects with storage_failed if db upsert fails', async () => {
        const state = makeState();
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', refresh_token: 'rtok', expires_in: 1000, scope: 'test' }) }) // token endpoint
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'gmailid', email: 'foo@gmail.com' }) }); // userinfo endpoint
        supabaseChain.select.mockReturnThis();
        supabaseChain.eq.mockReturnThis();
        supabaseChain.single.mockResolvedValue({ data: { user_id: 'user-abc', email: 'foo@gmail.com' } }); // same user
        supabaseChain.upsert.mockResolvedValue({ error: { message: 'fail' } });
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=storage_failed/);
    });

    it('returns HTML on successful account connect', async () => {
        const state = makeState();
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok', refresh_token: 'rtok', expires_in: 1000, scope: 'test' }) }) // token endpoint
            .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'gmailid', email: 'foo@gmail.com' }) }); // userinfo endpoint
        supabaseChain.select.mockReturnThis();
        supabaseChain.eq.mockReturnThis();
        supabaseChain.single.mockResolvedValue({ data: null });
        supabaseChain.upsert.mockResolvedValue({ error: null });
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('content-type')).toMatch(/text\/html/);
        const text = await response.text();
        expect(text).toMatch(HTML_CHECK);
        expect(text).toMatch(/You can now close this window/);
    });

    it('redirects with unexpected_error on thrown exception', async () => {
        fetchMock.mockImplementation(() => { throw new Error('fail!') });
        const state = makeState();
        const response = await GET(buildRequest({ code: 'c', state }));
        expect(response.headers.get('location')).toMatch(/error=unexpected_error/);
    });
});
