
jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));

jest.mock('../../app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

let eqMock: jest.Mock, singleMock: jest.Mock, deleteMock: jest.Mock;

jest.mock('@supabase/supabase-js', () => {
    eqMock = jest.fn();
    singleMock = jest.fn();
    deleteMock = jest.fn();
    return {
        createClient: jest.fn(() => ({
            from: () => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: singleMock,
                delete: deleteMock,
            }),
        })),
    };
});

import { DELETE } from '../../app/api/accounts/[id]/route';
import { NextRequest } from 'next/server';

const { getServerSession } = require('next-auth');
const supabaseClient = require('@supabase/supabase-js').createClient();

function buildParams(id: string) {
    return { params: { id } };
}

function buildRequest(): NextRequest {
    return {} as NextRequest;
}

describe('DELETE /accounts/[id]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 if user is not authenticated', async () => {
        getServerSession.mockResolvedValue(null);
        const response = await DELETE(buildRequest(), buildParams('test-id'));
        const json = await response.json();
        expect(response.status).toBe(401);
        expect(json).toEqual({ error: 'Unauthorized' });
    });

    it('returns 404 if account not found', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
        singleMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
        const response = await DELETE(buildRequest(), buildParams('notfound'));
        const json = await response.json();
        expect(response.status).toBe(404);
        expect(json).toEqual({ error: 'Account not found' });
    });

    it('returns 404 if account is not returned', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
        singleMock.mockResolvedValue({ data: null, error: null });
        const response = await DELETE(buildRequest(), buildParams('no-account'));
        const json = await response.json();
        expect(response.status).toBe(404);
        expect(json).toEqual({ error: 'Account not found' });
    });

    it('returns 400 if trying to remove primary account', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
        singleMock.mockResolvedValue({
            data: { is_primary: true },
            error: null,
        });
        const response = await DELETE(buildRequest(), buildParams('primary-id'));
        const json = await response.json();
        expect(response.status).toBe(400);
        expect(json).toEqual({ error: 'Cannot remove primary account' });
    });

    it('returns 500 if delete fails', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
        singleMock.mockResolvedValue({
            data: { is_primary: false },
            error: null,
        });
        deleteMock.mockReturnValue({
            eq: () => ({
                eq: () => Promise.resolve({ error: { message: 'delete failed' } }),
            }),
        });
        const response = await DELETE(buildRequest(), buildParams('fail-id'));
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Failed to delete account' });
    });

    it('returns success if account is deleted', async () => {
        getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
        singleMock.mockResolvedValue({
            data: { is_primary: false },
            error: null,
        });
        deleteMock.mockReturnValue({
            eq: () => ({
                eq: () => Promise.resolve({ error: null }),
            }),
        });
        const response = await DELETE(buildRequest(), buildParams('ok-id'));
        const json = await response.json();
        expect(response.status).toBe(200);
        expect(json).toEqual({ success: true });
    });

    it('catches thrown errors and returns 500', async () => {
        getServerSession.mockImplementation(() => { throw new Error('fail'); });
        const response = await DELETE(buildRequest(), buildParams('error-id'));
        const json = await response.json();
        expect(response.status).toBe(500);
        expect(json).toEqual({ error: 'Internal server error' });
    });
});
