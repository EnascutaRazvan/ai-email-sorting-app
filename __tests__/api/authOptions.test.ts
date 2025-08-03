let supabaseUpsertMock: jest.Mock

jest.mock('@supabase/supabase-js', () => {
    supabaseUpsertMock = jest.fn()
    return {
        createClient: jest.fn(() => ({
            from: jest.fn(() => ({
                upsert: supabaseUpsertMock,
            })),
        })),
    }
})

import { authOptions } from '../../app/api/auth/[...nextauth]/route'

describe('authOptions.callbacks.signIn', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    const user = {
        id: 'user-1',
        email: 'foo@bar.com',
        name: 'Foo Bar',
        image: 'https://bar.com/foo.jpg',
    }

    const account = {
        provider: 'google',
        providerAccountId: 'gmail-id-1',
        access_token: 'token123',
        refresh_token: 'refreshtoken',
    }

    it('returns true if provider is not google', async () => {
        const result = await authOptions.callbacks!.signIn!({ user, account: { ...account, provider: 'github' }, profile: {} })
        expect(result).toBe(true)
        expect(supabaseUpsertMock).not.toHaveBeenCalled()
    })

    it('returns false if user upsert fails', async () => {
        supabaseUpsertMock
            .mockResolvedValueOnce({ error: { message: 'fail' } }) // user upsert
        const result = await authOptions.callbacks!.signIn!({ user, account, profile: {} })
        expect(result).toBe(false)
    })

    it('returns false if account upsert fails', async () => {
        supabaseUpsertMock
            .mockResolvedValueOnce({ error: null }) // user upsert
            .mockResolvedValueOnce({ error: { message: 'account fail' } }) // account upsert
        const result = await authOptions.callbacks!.signIn!({ user, account, profile: {} })
        expect(result).toBe(false)
    })

    it('returns true if both upserts succeed', async () => {
        supabaseUpsertMock
            .mockResolvedValueOnce({ error: null }) // user upsert
            .mockResolvedValueOnce({ error: null }) // account upsert
        const result = await authOptions.callbacks!.signIn!({ user, account, profile: {} })
        expect(result).toBe(true)
    })

    it('returns false if callback throws', async () => {
        supabaseUpsertMock.mockImplementation(() => { throw new Error('crash!') })
        const result = await authOptions.callbacks!.signIn!({ user, account, profile: {} })
        expect(result).toBe(false)
    })
})

describe('authOptions.callbacks.jwt', () => {
    it('sets token fields from account and user', async () => {
        const token = {}
        const account = { access_token: 'a', refresh_token: 'b' }
        const user = { id: 'user-abc' }
        const result = await authOptions.callbacks!.jwt!({ token, account, user })
        expect(result.accessToken).toBe('a')
        expect(result.refreshToken).toBe('b')
        expect(result.id).toBe('user-abc')
    })

    it('returns existing token if no account or user', async () => {
        const token = { foo: 1 }
        const result = await authOptions.callbacks!.jwt!({ token })
        expect(result).toEqual({ foo: 1 })
    })
})

describe('authOptions.callbacks.session', () => {
    it('sets accessToken and user.id on session', async () => {
        const session = { user: {} }
        const token = { accessToken: 'a', id: 'b' }
        const result = await authOptions.callbacks!.session!({ session, token })
        expect(result.accessToken).toBe('a')
        expect(result.user.id).toBe('b')
    })
})
