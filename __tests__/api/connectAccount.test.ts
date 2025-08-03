
let getServerSessionMock: jest.Mock;

jest.mock('next-auth', () => {
    getServerSessionMock = jest.fn();
    return {
        getServerSession: getServerSessionMock,
    };
});

jest.mock('../../app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));



import { GET } from '../../app/api/auth/connect-account/route';
import { NextRequest } from 'next/server';

const OLD_ENV = process.env;

function buildRequest(): NextRequest {
    return {} as NextRequest;
}

describe('GET /auth/connect-account', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...OLD_ENV }; // Reset env vars
        process.env.GOOGLE_CLIENT_ID = 'test-client-id';
        process.env.NEXTAUTH_URL = 'https://localhost:3000';
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it('returns 401 if user is not authenticated', async () => {
        getServerSessionMock.mockResolvedValue(null);

        const response = await GET(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns an authUrl, state, and scopes if authenticated', async () => {
        getServerSessionMock.mockResolvedValue({
            user: { id: 'user-123' }
        });

        const response = await GET(buildRequest());
        const json = await response.json();

        expect(response.status).toBe(200);

        // Validate authUrl structure and returned data
        expect(json.authUrl).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
        expect(json.state).toBeDefined();
        expect(typeof json.state).toBe('string');
        expect(json.scopes).toEqual([
            "Gmail Read Access",
            "Gmail Modify Access",
            "Profile Information",
        ]);

        // Optionally, check state can be decoded
        const stateObj = JSON.parse(Buffer.from(json.state, 'base64url').toString());
        expect(stateObj.userId).toBe('user-123');
        expect(typeof stateObj.timestamp).toBe('number');
        expect(typeof stateObj.nonce).toBe('string');
    });

    it('returns 500 and error message if handler throws', async () => {
        getServerSessionMock.mockImplementation(() => { throw new Error('fail!') });

        process.env.NODE_ENV = 'production'; // Hide error details
        const response = await GET(buildRequest());
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json.error).toBe('Failed to generate authorization URL');
        expect(json.details).toBeUndefined();

        // Show details in development mode
        process.env.NODE_ENV = 'development';
        const responseDev = await GET(buildRequest());
        const jsonDev = await responseDev.json();
        expect(responseDev.status).toBe(500);
        expect(jsonDev.error).toBe('Failed to generate authorization URL');
        expect(jsonDev.details).toBeDefined();
    });
});
